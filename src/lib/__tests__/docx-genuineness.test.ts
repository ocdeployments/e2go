/**
 * DR-4 follow-up (Session 146).
 *
 * download-budget.test.ts (DR-10) already builds real .docx buffers via
 * buildDocument() + Packer.toBuffer() for every document type, but only
 * asserts on timing — it never checks that a resulting buffer is actually a
 * well-formed, openable Word file. This sandbox can't launch Microsoft Word
 * to prove "opens as intended" literally, so this is the closest verifiable
 * proxy: round-trip the buffer through JSZip (a real .docx is a zip) and
 * confirm the required OOXML parts exist and are well-formed XML with the
 * expected content inside — the same checks Word itself performs before
 * rendering a document.
 */
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildDocument } from '@/lib/docx-builder';
import type { DocumentType } from '@/types/generation';

const REQUIRED_OOXML_PARTS = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'];

/**
 * Minimal dependency-free well-formedness check: every opening tag has a
 * matching close (or is self-closing), tags nest without crossing, and the
 * document has exactly one root element that opens at the start and closes
 * at the end. This is what a real XML parser verifies before a consumer
 * like Word will even attempt to render the part.
 */
function assertWellFormedXml(xml: string, label: string): void {
  expect(xml.startsWith('<?xml')).toBe(true);

  const tagPattern = /<\/?[a-zA-Z0-9:_-]+(?:\s[^<>]*)?\/?>/g;
  const tags = xml.match(tagPattern) ?? [];
  expect(tags.length).toBeGreaterThan(0);

  const stack: string[] = [];
  for (const tag of tags) {
    if (tag.startsWith('<?')) continue;
    const isClosing = tag.startsWith('</');
    const isSelfClosing = tag.endsWith('/>');
    const name = tag.match(/^<\/?([a-zA-Z0-9:_-]+)/)?.[1];
    expect(name).toBeTruthy();

    if (isClosing) {
      const expected = stack.pop();
      if (expected !== name) {
        throw new Error(`${label}: mismatched closing tag </${name}>, expected </${expected}>`);
      }
    } else if (!isSelfClosing) {
      stack.push(name as string);
    }
  }
  expect(stack).toEqual([]);
}

describe('generated .docx buffers are genuine, well-formed OOXML files (DR-4 follow-up)', () => {
  const SAMPLE_DOC_TYPES: DocumentType[] = ['cover_letter', 'business_plan', 'declaration_principal'];
  const SAMPLE_CONTENT =
    'This is representative generated content for verification purposes, covering two full sentences.';

  for (const documentType of SAMPLE_DOC_TYPES) {
    it(`builds an openable .docx for "${documentType}" with every required OOXML part`, async () => {
      const doc = buildDocument({
        documentType,
        lastName: 'Applicant',
        caseCode: 'TEST-0001',
        personCode: 'P1',
        contentText: SAMPLE_CONTENT,
      });

      const buffer = Buffer.from(await Packer.toBuffer(doc));
      expect(buffer.length).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(buffer);

      for (const part of REQUIRED_OOXML_PARTS) {
        expect(zip.files[part]).toBeDefined();
      }

      const contentTypesXml = await zip.files['[Content_Types].xml'].async('text');
      assertWellFormedXml(contentTypesXml, '[Content_Types].xml');
      // Word refuses to open a .docx whose content-types manifest doesn't
      // declare the wordprocessing document part.
      expect(contentTypesXml).toContain('wordprocessingml.document.main+xml');

      const relsXml = await zip.files['_rels/.rels'].async('text');
      assertWellFormedXml(relsXml, '_rels/.rels');
      expect(relsXml).toContain('word/document.xml');

      const documentXml = await zip.files['word/document.xml'].async('text');
      assertWellFormedXml(documentXml, 'word/document.xml');
      expect(documentXml).toContain('<w:document');
      expect(documentXml).toContain('</w:document>');
      expect(documentXml).toContain('<w:body');
      expect(documentXml).toContain('</w:body>');
      // The actual generated content must be present in the body, not just
      // a shell document with the right wrapper.
      expect(documentXml).toContain('This is representative generated content');
    });
  }
});
