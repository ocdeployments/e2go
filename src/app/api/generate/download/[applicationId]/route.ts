import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DOCUMENT_ORDER = [
  { type: "cover_letter", name: "01-Cover-Letter.pdf" },
  { type: "source_of_funds", name: "02-Source-of-Funds.pdf" },
  { type: "investment_proof", name: "03-Investment-Proof.pdf" },
  { type: "business_plan", name: "04-Business-Plan.pdf" },
  { type: "qualifications", name: "05-Qualifications.pdf" },
  { type: "ds160_reference", name: "06-DS160-Reference.pdf" },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  const applicationId = params.applicationId;
  const authHeader = request.headers.get("authorization");
  const userId = authHeader?.replace("Bearer ", "");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // 1. Verify auth - user must own this application
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("user_id, applicant_name")
    .eq("id", applicationId)
    .single();

  if (appError || !application || application.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Verify acknowledgment gate (handled client-side, but we can check a db column if it exists)
  // For now, we trust the client-side gate as per the current schema,
  // but we STRICTLY enforce that ALL documents must be 'approved'.

  // 3. Read all approved documents from DB for this application
  const { data: documents, error: docError } = await supabase
    .from("generated_documents")
    .select("document_type, content_text, approved_at")
    .eq("application_id", applicationId)
    .eq("status", "approved");

  if (docError || !documents) {
    return NextResponse.json({ error: "No approved documents found" }, { status: 400 });
  }

  const approvedDocs = new Map(documents.map((d) => [d.document_type, d.content_text || ""]));

  // Verify all required documents are approved
  for (const doc of DOCUMENT_ORDER) {
    if (!approvedDocs.has(doc.type)) {
      return NextResponse.json(
        { error: `Missing approved document: ${doc.type}` },
        { status: 400 }
      );
    }
  }

  // 3b. Fetch data for e2go-application-export.json (Section 13E)
  const { data: module3Answers } = await supabase
    .from("answers")
    .select("question_id, answer_value, question_text")
    .eq("application_id", applicationId);

  const { data: caseBrief } = await supabase
    .from("case_briefs")
    .select("case_brief_json")
    .eq("application_id", applicationId)
    .single();

  const { data: quizData } = await supabase
    .from("quiz_sessions")
    .select("quiz_answers, created_at")
    .eq("application_id", applicationId)
    .single();

  const applicationMetadata = {
    application_id: applicationId,
    applicant_name: application.applicant_name,
    exported_at: new Date().toISOString(),
    version: "1.0.0",
  };

  const exportJson = {
    metadata: applicationMetadata,
    module_3_answers: module3Answers || [],
    generated_documents: documents.map((d) => ({
      document_type: d.document_type,
      content: d.content_text,
    })),
    tab_i_projections: (caseBrief?.case_brief_json as Record<string, unknown>)?.tab_i_projections || null,
    quiz_session: quizData || null,
  };

  // 4. Create ZIP archive using JSZip
  const zip = new JSZip();

  try {
    for (const doc of DOCUMENT_ORDER) {
      const content = approvedDocs.get(doc.type) || "";

      const pdfDoc = await PDFDocument.create();

      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setCreator("");
      pdfDoc.setProducer("");
      pdfDoc.setKeywords([]);

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const fontSize = 11;
      const margin = 50;
      const lineHeight = fontSize * 1.5;
      const maxLinesPerPage = Math.floor((height - 2 * margin) / lineHeight);

      // Simple word wrap and pagination
      const lines = content.split("\n");
      let currentPageLines: string[] = [];

      const addPage = () => {
        if (currentPageLines.length > 0) {
          let y = height - margin;
          for (const line of currentPageLines) {
            page.drawText(line, {
              x: margin,
              y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            y -= lineHeight;
          }
        }
      };

      for (const line of lines) {
        const words = line.split(" ");
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (textWidth > width - 2 * margin) {
            currentPageLines.push(currentLine);
            if (currentPageLines.length >= maxLinesPerPage) {
              addPage();
              page = pdfDoc.addPage([595.28, 841.89]);
              currentPageLines = [];
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          currentPageLines.push(currentLine);
          if (currentPageLines.length >= maxLinesPerPage) {
            addPage();
            page = pdfDoc.addPage([595.28, 841.89]);
            currentPageLines = [];
          }
        } else {
          currentPageLines.push("");
          if (currentPageLines.length >= maxLinesPerPage) {
            addPage();
            page = pdfDoc.addPage([595.28, 841.89]);
            currentPageLines = [];
          }
        }
      }

      addPage();

      const pdfBytes = await pdfDoc.save();
      zip.file(doc.name, Buffer.from(pdfBytes));
    }

    // Add README
    const readmeContent = `E-2 Visa Application Package
Prepared: ${new Date().toLocaleDateString()}
Applicant: ${application.applicant_name || "Applicant"}

This package contains ${DOCUMENT_ORDER.length} documents for your E-2 visa application.
Present documents in the order numbered above unless your consulate specifies otherwise.

Documents prepared using e2go.app. All content reviewed and approved by the applicant prior to download.
This package does not constitute legal advice.
`;
    zip.file("README-Binder-Assembly.txt", readmeContent);
    zip.file("e2go-application-export.json", JSON.stringify(exportJson, null, 2));

    const zipBlob = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(zipBlob as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="e2go-embassy-package-${(application.applicant_name || "applicant").replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error("PDF/ZIP generation failed:", error);
    return NextResponse.json({ error: "Failed to generate package" }, { status: 500 });
  }
}
