"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

const TREATY_COUNTRIES = [
  "Albania","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belgium","Bolivia","Bosnia and Herzegovina",
  "Bulgaria","Cameroon","Canada","Chile","Colombia","Congo",
  "Costa Rica","Croatia","Czech Republic","Denmark","Ecuador",
  "Egypt","Estonia","Ethiopia","Finland","France","Georgia",
  "Germany","Greece","Grenada","Honduras","Ireland","Israel",
  "Italy","Japan","Jordan","Kazakhstan","South Korea","Kosovo",
  "Kyrgyzstan","Latvia","Liberia","Lithuania","Luxembourg",
  "Macedonia","Mexico","Moldova","Mongolia","Montenegro","Morocco",
  "Netherlands","New Zealand","Norway","Oman","Pakistan","Panama",
  "Paraguay","Philippines","Poland","Romania","Senegal","Serbia",
  "Singapore","Slovak Republic","Slovenia","Spain","Sri Lanka",
  "Suriname","Sweden","Switzerland","Thailand","Togo",
  "Trinidad and Tobago","Tunisia","Turkey","Ukraine",
  "United Kingdom","Yugoslavia"
];

const CORE_QUESTION_COUNT = 16;

const SECTIONS = ["Eligibility","Investment","Business","History","Home ties","Family"];

const HARD_STOPS: Record<string, { title: string; body: string }> = {
  "PR-01": {
    title: "Citizenship in a treaty country required",
    body: "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify. We recommend consulting a qualified immigration attorney about alternative visa options."
  },
  "PR-02": {
    title: "Loan-funded investments require legal review",
    body: "The E-2 requires capital you own and control. A primarily loan-funded investment does not meet this requirement. A qualified immigration attorney can assess your specific situation."
  },
  "PR-03": {
    title: "Investment capital required",
    body: "The E-2 visa requires an active investment of your own capital. Without available funds you do not currently meet this requirement. When your situation changes, we will be here."
  },
  "PR-04": {
    title: "Investment below threshold",
    body: "An investment under $50,000 USD faces very high risk of refusal. We would rather be honest with you now than take your money for a process unlikely to succeed at this level."
  },
  "PR-05": {
    title: "Documentation required",
    body: "The consulate expects to trace every dollar from its origin to your business. Without documentation they cannot verify your investment is lawful — and this is grounds for refusal."
  },
  "PR-06": {
    title: "Active management required",
    body: "The E-2 requires that you enter the U.S. to develop and direct your business. A passive investment role does not meet this requirement."
  },
  "PR-06b": {
    title: "Three or more partners changes your E-2 classification",
    body: "Under 9 FAM 402.9, an equal partnership with more than two partners does not give any individual investor control based on ownership alone — the element of control is considered too remote. This means none of you can be classified as an E-2 treaty investor based on your ownership stake.\n\nYou have two options:\n\n1. Restructure to a two-party structure. If the business can be reorganised so that only two partners each hold 50%, both can apply as E-2 investors. The remaining investors would need to reduce their ownership or exit.\n\n2. Apply as an E-2 employee. If your company is majority-owned (50%+) by nationals of a treaty country collectively, and you hold an executive, supervisory, or essential skills role, you may qualify for an E-2 visa as an employee rather than as the investor. This is a different application type with different requirements.\n\nE2go prepares E-2 investor applications. We recommend consulting a U.S. immigration attorney to assess your options."
  },
  "PR-PASSIVE-INVEST": {
    title: "This investment structure does not qualify",
    body: "A stock portfolio, financial investment account, or purely passive real estate holding does not meet the E-2 requirement for a real and operating commercial enterprise. The E-2 requires an active business — not a passive investment vehicle. Please consult an immigration attorney about alternative visa options."
  },
  "PR-NONPROFIT": {
    title: "Non-profit organisations do not qualify",
    body: "Non-profit organisations are explicitly excluded from E-2 investor classification under 9 FAM 402.9-6(C). The E-2 requires a for-profit commercial enterprise. Please consult an immigration attorney about alternative options."
  },
  "PR-07": {
    title: "This business type does not qualify",
    body: "Cannabis is federally illegal in the U.S. Passive real estate, gambling, and adult entertainment do not meet E-2 requirements. Speak with an attorney about alternative options."
  },
  "PR-08": {
    title: "Serious convictions require legal assessment",
    body: "Certain criminal convictions create grounds of inadmissibility under U.S. immigration law. This requires assessment by a qualified immigration attorney before you proceed."
  },
  "PR-09": {
    title: "U.S. presence without valid status",
    body: "Applying while inside the U.S. without valid immigration status creates serious legal risk and may permanently affect your ability to re-enter. Please consult a qualified immigration attorney immediately."
  }
};

type Answer = string | string[];

const QUESTIONS = [
  {
    id: "Q0-01", sec: 0, type: "country",
    q: "What is your citizenship?",
    help: "The E-2 visa requires citizenship in a qualifying treaty country. Permanent residency alone does not qualify.",
    tip: "There are 82 E-2 treaty countries. Dual citizenship in any treaty country qualifies you.",
  },
  {
    id: "Q0-02", sec: 0, type: "select",
    q: "Where are you applying from?",
    help: "Your location determines which application path is available to you.",
    tip: "Most applicants apply through their home country consulate. If you are in the U.S. on valid status, Change of Status may be an option.",
    opts: [
      { t: "From my home country — consular processing", a: "ok" },
      { t: "From inside the U.S. — on a valid visa or status", a: "ok" },
      { t: "From inside the U.S. — without valid status", a: "stop", code: "PR-09" },
    ]
  },
  {
    id: "Q0-03", sec: 1, type: "select",
    q: "How are you funding your investment?",
    help: "The E-2 requires capital you own and control — committed to the business.",
    tip: "Borrowed funds can be part of the picture but cannot be the primary source.",
    opts: [
      { t: "Personal funds — ready or accessible", a: "ok" },
      { t: "Liquidating assets to fund it", a: "ok" },
      { t: "Primarily a business loan or third-party financing", a: "stop", code: "PR-02" },
      { t: "I don't have funds available yet", a: "stop", code: "PR-03" },
    ]
  },
  {
    id: "Q0-04", sec: 1, type: "select",
    q: "How much are you investing?",
    help: "No official minimum exists, but consulates expect the investment to be substantial relative to the total business cost.",
    tip: "The substantiality test compares your investment to the total cost of establishing the business.",
    opts: [
      { t: "Over $150,000 USD", a: "ok" },
      { t: "$100,000 – $150,000 USD", a: "ok" },
      { t: "$75,000 – $99,999 USD", a: "warn", w: "Within range — your business selection will be critical at this level." },
      { t: "$50,000 – $74,999 USD", a: "warn", w: "Below the typical threshold. This significantly narrows eligible business types." },
      { t: "Under $50,000 USD", a: "stop", code: "PR-04" },
    ]
  },
  {
    id: "Q0-05a", sec: 1, type: "select", isSub: true,
    q: "How committed is your investment at this point?",
    help: "The E-2 requires that funds be irrevocably committed and at risk — not just planned. An officer will ask whether your money is actually in the business, not just earmarked for it.",
    tip: "The 'in the process of investing' standard under 9 FAM requires binding, irrevocable commitment of capital — not just availability of funds.",
    showIf: (answers: Record<string, string | string[]>) => {
      const amt = answers["Q0-04"];
      if (typeof amt === "string") {
        return amt !== "Over $150,000 USD" && amt !== "$100,000 – $150,000 USD";
      }
      return false;
    },
    opts: [
      { t: "Fully committed — funds are already in the US business account or spent on business expenses", a: "ok" },
      { t: "Substantially committed — signed contracts, escrow, or franchise agreement signed with deposit paid", a: "ok" },
      { t: "Partially committed — some funds committed, remainder being transferred", a: "warn", w: "Your application will need to show a clear timeline for when the remaining funds will be deployed. Officers look for a credible plan with specific dates and committed steps, not just a statement of intent." },
      { t: "Not yet committed — I have the funds available but not yet deployed", a: "warn", w: "Under 9 FAM 402.9-6(A), the 'in the process of investing' standard requires binding, irrevocable commitment of capital — not just availability of funds. Before your interview, you will need signed business agreements, an executed franchise agreement with deposit, a lease, or other binding commitments that place the funds at risk." },
      { t: "In the planning stage — I have not yet secured the funds", a: "warn", w: "You are not yet in the process of investing under US immigration law. Before applying, you need binding commitments that put capital at risk. We recommend waiting until you have signed contracts and committed funds before beginning your application." },
    ]
  },
  {
    id: "Q0-05", sec: 1, type: "multi",
    q: "Where did this money originate?",
    help: "Select all that apply — this builds your source-of-funds narrative for the consulate.",
    tip: "A complete, unbroken paper trail from source to investment is one of the most scrutinised elements of any E-2 application.",
    opts: [
      { t: "Personal savings" }, { t: "Property sale" }, { t: "Business sale" },
      { t: "Inheritance or gift" }, { t: "Retirement account withdrawal" },
      { t: "Investment portfolio" }, { t: "Home equity loan" },
      { t: "Employment income accumulated over time" },
    ]
  },
  {
    id: "Q0-06", sec: 1, type: "select",
    q: "How well documented is your funds trail?",
    help: "Bank statements, contracts, records — the consulate will trace every dollar from source to investment.",
    tip: "Gaps in documentation are a leading cause of 221(g) requests and refusals.",
    opts: [
      { t: "Fully documented — bank statements, contracts, records", a: "ok" },
      { t: "Mostly — minor gaps I can explain", a: "warn", w: "Minor gaps are manageable with a clear narrative. We will help you address them." },
      { t: "Partial — significant gaps exist", a: "warn", w: "Significant gaps are a serious risk factor. Legal guidance is strongly recommended." },
      { t: "I cannot document the source of my funds", a: "stop", code: "PR-05" },
    ]
  },
  {
    id: "Q0-07", sec: 2, type: "select",
    q: "What will your role in this business be?",
    help: "The E-2 requires that you enter the U.S. to develop and direct your business — not simply hold an investment.",
    tip: "Active management means day-to-day involvement. A supervisory-only role significantly weakens your application.",
    opts: [
      { t: "Primary owner-operator — managing day-to-day", a: "ok" },
      { t: "50/50 partner — both of us managing the business", a: "ok" },
      { t: "I'll hire a manager — involved but not daily", a: "warn", w: "A supervisory-only role is a risk factor. Your application must demonstrate meaningful active involvement." },
      { t: "Passive investor — not involved in operations", a: "stop", code: "PR-06" },
    ]
  },
  {
    id: "Q0-08", sec: 2, type: "select",
    q: "Where are you in your business search?",
    help: "You do not need a business chosen to start. Knowing where you are helps us guide you correctly.",
    tip: "The business must be real and operating — or at a committed stage of investment — by your consulate interview.",
    opts: [
      { t: "I have a specific business or franchise in mind", a: "sub08a" },
      { t: "I have a general direction but haven't chosen yet", a: "broker" },
      { t: "I'm open — I haven't started looking", a: "broker" },
    ]
  },
  {
    id: "Q0-08a", sec: 2, type: "select", isSub: true,
    q: "What kind of business is it?",
    help: "",
    tip: "Certain business types are categorically incompatible with the E-2 visa regardless of investment amount.",
    opts: [
      { t: "A franchise — buying into an established brand", a: "broker" },
      { t: "Buying an existing independent business", a: "ok" },
      { t: "Starting a new business from scratch", a: "ok" },
      { t: "Professional services or consulting", a: "warn", w: "Solo consulting businesses can face scrutiny under the marginality test. Your plan must show capacity to grow beyond one person." },
      { t: "Cannabis, gambling, adult entertainment, or passive real estate", a: "stop", code: "PR-07" },
      { t: "Something else", a: "ok" },
    ]
  },
  {
    id: "Q0-08b", sec: 2, type: "select", isSub: true,
    q: "Would you like us to make an introduction?",
    help: "Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.",
    tip: "Our broker partners understand which businesses have the strongest track record at consulates worldwide.",
    opts: [
      { t: "Yes — please connect me with a broker", a: "franchise_yes" },
      { t: "No thanks, I'll find one myself", a: "ok" },
    ]
  },
  {
    id: "Q0-09a", sec: 2, type: "select", isSub: true,
    q: "Is your US business an active, operating commercial enterprise?",
    help: "The E-2 requires a real, active, for-profit business — not a passive investment. Some structures do not qualify.",
    tip: "Undeveloped land, stock portfolios, and non-profit organisations are explicitly excluded under 9 FAM 402.9-6(C).",
    opts: [
      { t: "Yes — it is an active business selling goods or services", a: "ok" },
      { t: "It is a real estate investment or property holding", a: "warn", w: "Pure real estate investment — undeveloped land or properties held for appreciation — does not meet the 'real and operating enterprise' requirement. However, an active real estate business (property management, development, hospitality) may qualify if you can demonstrate real operations, employees, and non-marginality." },
      { t: "It is a stock portfolio or financial investment", a: "stop", code: "PR-PASSIVE-INVEST" },
      { t: "It is a non-profit or charitable organisation", a: "stop", code: "PR-NONPROFIT" },
      { t: "I am not sure of the structure", a: "warn", w: "Confirm your business structure with an attorney before proceeding. The E-2 requires a real, active, for-profit commercial enterprise — the structure matters." },
    ]
  },
  {
    id: "Q0-09", sec: 3, type: "select",
    q: "Have you ever been refused a U.S. visa?",
    help: "Prior refusals must be disclosed on your DS-160 form. They are not automatically disqualifying but require careful handling.",
    tip: "Honest disclosure is legally required. Concealing a prior refusal is grounds for a permanent bar from the United States.",
    opts: [
      { t: "No", a: "ok" },
      { t: "Yes — once, more than 5 years ago", a: "warn", w: "An older refusal is manageable with proper preparation and honest disclosure. We will address it in your application." },
      { t: "Yes — once within the last 5 years", a: "attorney" },
      { t: "Yes — more than once", a: "attorney" },
    ]
  },
  {
    id: "Q0-10", sec: 3, type: "select",
    q: "Have you ever been refused entry to the U.S. or deported?",
    help: "",
    tip: "Removal or deportation creates additional grounds of inadmissibility that must be disclosed and addressed.",
    opts: [
      { t: "No", a: "ok" },
      { t: "Refused entry at the border", a: "attorney" },
      { t: "Deported or removed from the U.S.", a: "attorney" },
    ]
  },
  {
    id: "Q0-11", sec: 3, type: "select",
    q: "Do you have any criminal convictions?",
    help: "Include convictions in any country. Certain offences create grounds of inadmissibility under U.S. immigration law.",
    tip: "Even minor convictions in your home country may affect U.S. admissibility. Honest disclosure is legally required.",
    opts: [
      { t: "No criminal convictions", a: "ok" },
      { t: "Minor conviction — more than 10 years ago", a: "warn", w: "An older minor conviction may not affect admissibility but must be disclosed. We will address it in your interview preparation." },
      { t: "Minor conviction — within the last 10 years", a: "attorney" },
      { t: "Serious conviction", a: "stop", code: "PR-08" },
      { t: "I'm not sure whether my record affects admissibility", a: "attorney" },
    ]
  },
  {
    id: "Q0-12", sec: 4, type: "select",
    q: "What is your plan for your home country property?",
    help: "The consulate must be confident you intend to return home when your visa expires.",
    tip: "Selling your home country property before your visa is approved is one of the most cited reasons for a 214(b) immigrant intent refusal.",
    opts: [
      { t: "I own property and plan to keep it", a: "ok" },
      { t: "I own property and plan to sell it before my interview", a: "warn", w: "Selling your home country property before your visa is approved is one of the most cited reasons for a 214(b) refusal. Do not sell until after your visa is stamped." },
      { t: "I own property — undecided on selling", a: "warn", w: "We strongly recommend not selling your home country property until after your visa is approved." },
      { t: "I rent — no property to consider", a: "ok" },
      { t: "I don't own property in my home country", a: "ok" },
    ]
  },
  {
    id: "Q0-13a", sec: 4, type: "select",
    q: "Are your spouse and children moving to the US with you?",
    help: "This determines who will be included in your E-2 application as dependents.",
    tip: "Spouse and children staying behind is a different situation from parents or siblings staying — the scoring and document implications are entirely different.",
    opts: [
      { t: "Yes — my spouse and children are moving with me", a: "ok" },
      { t: "My spouse is moving with me, children staying in home country", a: "ok" },
      { t: "Spouse and children are staying — I am moving alone initially", a: "warn", w: "Moving alone while family stays behind can raise questions about your plan. Prepare a clear explanation for your cover letter about when your family will join." },
      { t: "Not applicable — I have no spouse or children", a: "ok" },
    ]
  },
  {
    id: "Q0-13b", sec: 4, type: "select",
    q: "Do you have parents, siblings, or other close family who will remain after you move?",
    help: "The consulate scores ties to your home country. Extended family remaining is one of the strongest signals of non-immigrant intent.",
    tip: "The E-2 is a nonimmigrant visa — demonstrating strong home country ties is one of the most important elements of your application.",
    opts: [
      { t: "Yes — parents remaining", a: "ok" },
      { t: "Yes — siblings remaining", a: "ok" },
      { t: "Yes — parents and siblings remaining", a: "ok" },
      { t: "Yes — other close family remaining", a: "ok" },
      { t: "No — no extended family remaining in home country", a: "warn", w: "No remaining extended family ties means other ties — property, financial accounts, employment — will carry more weight. Ensure these are well documented." },
    ]
  },
  {
    id: "Q0-14", sec: 4, type: "select",
    q: "Will you keep your home country financial accounts active?",
    help: "Maintaining financial ties demonstrates intent to return — a key part of the nonimmigrant intent assessment.",
    tip: "Closing all home country accounts before your visa interview significantly weakens your nonimmigrant intent profile.",
    opts: [
      { t: "Yes — keeping all accounts and investments active", a: "ok" },
      { t: "Keeping some, closing others", a: "ok" },
      { t: "Planning to close everything", a: "warn", w: "Closing all home country financial accounts before your interview is a red flag for immigrant intent. We strongly recommend keeping at least one account active." },
      { t: "Not sure yet", a: "ok" },
    ]
  },
  {
    id: "Q0-15", sec: 5, type: "select",
    q: "Will you have a business partner on this application?",
    help: "The E-2 allows a maximum of two investors per business. For unrelated partners: each must own exactly 50%. For spousal partnerships: the principal applicant must be the owner-operator with majority or equal control.",
    tip: "For unrelated partners: each investor must own exactly 50% to qualify independently. For spousal partnerships: the principal applicant must be the owner-operator with majority or equal control — the spouse's ownership percentage is more flexible as long as the applicant clearly develops and directs the business.",
    opts: [
      { t: "No — I am the sole investor", a: "ok" },
      { t: "Yes — one partner, 50/50 ownership", a: "ok" },
      { t: "Yes — one partner, my spouse (any ownership split)", a: "sub14b" },
      { t: "Yes — one partner, ownership split not yet decided", a: "warn", w: "If applying with a partner, the split must be exactly 50/50 for both to qualify. Confirm this before proceeding." },
      { t: "Yes — more than one partner (attorney review required)", a: "stop", code: "PR-06b" },
    ]
  },
  {
    id: "Q0-14b", sec: 5, type: "select", isSub: true,
    q: "What will be your spouse's role in the business?",
    help: "A spouse who is a silent investor can hold a minority stake. A spouse who co-operates the business alongside you may qualify for their own E-2 status.",
    tip: "If your spouse will be actively involved, their qualifications need to be documented separately — this can strengthen your application significantly.",
    opts: [
      { t: "Active co-operator — managing the business with me", a: "ok" },
      { t: "Silent investor — ownership stake, not day-to-day involved", a: "ok" },
      { t: "Not yet decided", a: "ok" },
    ]
  },
  {
    id: "Q0-14c", sec: 2, type: "select", isSub: true,
    q: "Do you own your share of the US business directly, or through a holding company, trust, or other entity?",
    help: "Under US immigration law, the 50% treaty-national ownership test applies through the full ownership chain — not just at the top level. If you own the US business through an intermediate entity, your effective ownership percentage may be different from what you expect.",
    tip: "A Canadian who owns 100% of a Canadian holdco that owns 40% of the US business has an effective ownership of 40% — below the 50% threshold.",
    showIf: (answers: Record<string, string | string[]>) => {
      const partner = answers["Q0-15"];
      if (typeof partner === "string") {
        return partner.includes("partner") || partner.includes("spouse");
      }
      return false;
    },
    opts: [
      { t: "Directly — I own my share personally in my own name", a: "ok" },
      { t: "Through a holding company or corporation", a: "warn", w: "Because you own through a holding company, the 50% test applies through the chain. Your effective ownership percentage equals: (your % of the holdco) × (holdco's % of the US business). For example, if you own 100% of a holdco that owns 45% of the US business, your effective ownership is 45% — below the 50% threshold. Your ownership documentation will need to show the full chain clearly." },
      { t: "Through a family trust or other trust structure", a: "attorney", w: "Trust ownership adds complexity to the treaty-national ownership analysis. Whether trust assets are attributed to the settlor, beneficiaries, or trustee depends on the trust structure. We recommend attorney review for trust-held E-2 investments." },
      { t: "Through a combination of the above", a: "attorney", w: "Complex ownership structures require careful analysis of the full ownership chain. We recommend attorney review to confirm your effective treaty-national ownership percentage." },
      { t: "I am not sure", a: "warn", w: "Confirm your ownership structure with your accountant or attorney before proceeding. The 50% treaty-national ownership test applies through the full chain of entities — understanding your structure is essential." },
    ]
  },
  {
    id: "Q0-14d", sec: 2, type: "select", isSub: true,
    q: "Even though your ownership may be below 50%, do you have documented control rights over the business?",
    help: "Under US immigration law, control can be demonstrated through means other than majority ownership — including a managerial position, board control, veto rights, or other corporate governance rights written into your operating agreement or shareholder agreement.",
    tip: "9 FAM 402.9 states: 'Control of the enterprise may be demonstrated by ownership of at least 50 percent of the business, by possession of operational control through a managerial position or other corporate device, or by other means.'",
    showIf: (answers: Record<string, string | string[]>) => {
      const own = answers["Q0-14c"];
      if (typeof own === "string") {
        return own !== "Directly — I own my share personally in my own name";
      }
      return false;
    },
    opts: [
      { t: "Yes — I have veto rights or board control written into the operating agreement", a: "ok", w: "Your application will need to document these control rights clearly in your cover letter and operating agreement. The consular officer will look for: a copy of the operating or shareholder agreement showing your specific rights, a description of which decisions require your approval, and evidence that these rights are active and enforceable — not just on paper." },
      { t: "Yes — I hold an executive or managerial title with documented decision-making authority", a: "ok", w: "Your application will need to document these control rights clearly. Include your title, scope of authority, and evidence that your role gives you operational control over the business." },
      { t: "Yes — I have special voting shares or other governance rights", a: "ok", w: "Document these governance rights in your operating agreement or shareholder agreement. The officer will look for evidence that these rights are active and give you meaningful control over business decisions." },
      { t: "No — my control is based on ownership percentage only", a: "warn", w: "Without majority ownership or documented control rights, you may not meet the 'develop and direct' requirement under 9 FAM. Consider whether your operating agreement can be amended to grant you veto rights or board control before your interview." },
      { t: "I am not sure", a: "attorney", w: "Confirm whether your ownership structure includes any documented control rights. Without majority ownership or control rights, the 'develop and direct' requirement may not be met. Attorney review is recommended." },
    ]
  },
  {
    id: "Q0-14e", sec: 2, type: "select", isSub: true,
    q: "You and your partner hold different nationalities. Which country's treaty will be the basis for your E-2 application?",
    help: "A US business can generally have only one E-2 nationality — determined by which treaty country's nationals own at least 50% of the enterprise. All E-2 visa holders working for this company must share that nationality.",
    tip: "Under 9 FAM 402.9-4(B), if a business is equally owned by nationals of two different treaty countries, E-2 visas may be issued to employees of either treaty country — but you should pick one designation and keep it consistent.",
    showIf: (answers: Record<string, string | string[]>) => {
      const partner = answers["Q0-15"];
      const spouseRole = answers["Q0-14b"];
      if (typeof partner === "string" && (partner.includes("50/50") || partner.includes("more than one"))) {
        if (typeof spouseRole === "string" && spouseRole.includes("spouse")) return false;
        return true;
      }
      return false;
    },
    opts: (() => {
      const fallback = [
        { t: "My country — I am the majority or equal owner", a: "ok" },
        { t: "My partner's country — they are the majority owner", a: "ok" },
        { t: "We have equal ownership — either nationality could work", a: "ok", w: "Under 9 FAM, if a business is equally owned by nationals of two different treaty countries, E-2 visas may be issued to employees of either treaty country. However, you should pick one designation for the business and keep it consistent across all documents." },
        { t: "I am not sure — we need to decide this", a: "attorney" },
      ];
      return fallback;
    })(),
  },
  {
    id: "Q0-16", sec: 5, type: "select",
    q: "Will your spouse or children be joining you in the U.S.?",
    help: "Your spouse and unmarried children under 21 can apply as E-2 dependents. Your spouse may also apply for U.S. work authorisation.",
    tip: "Dependent status is tied to your E-2 visa. If your visa expires or is revoked, dependent status ends simultaneously.",
    opts: [
      { t: "Just me — no dependents", a: "ok" },
      { t: "My spouse or partner", a: "sub03a" },
      { t: "My spouse and children", a: "sub16a" },
      { t: "My children only", a: "sub16a" },
      { t: "Not decided yet", a: "ok" },
    ]
  },
  {
    id: "Q0-16a", sec: 5, type: "select", isSub: true,
    q: "How old are the children who will be joining you?",
    help: "E-2 dependent status is only available to unmarried children under 21.",
    tip: "Children lose E-2 dependent status on their 21st birthday. Early planning is critical for children approaching this age.",
    opts: [
      { t: "All under 18", a: "ok" },
      { t: "One or more are 18–20", a: "warn", w: "Children lose E-2 dependent status on their 21st birthday. If a child is 18–20, your timeline must account for this window. We will flag this in your compliance calendar." },
      { t: "One or more are 21 or older", a: "warn", w: "Children 21 or older cannot be included as E-2 dependents. They would need to apply for their own visa separately." },
    ]
  },
  {
    id: "Q0-03a", sec: 5, type: "select", isSub: true,
    q: "Who is the primary E-2 applicant?",
    help: "If you are married, one spouse is the principal applicant whose qualifications, investment, and business experience lead the application. The other spouse applies as a dependent — or independently if they are also investing.",
    tip: "All questions should be answered from the principal applicant's perspective. Their qualifications, investment, and role in the business are what the consulate will evaluate.",
    showIf: (answers: Record<string, string | string[]>) => {
      const dep = answers["Q0-16"];
      if (typeof dep === "string") {
        return dep.includes("spouse") || dep.includes("partner");
      }
      return false;
    },
    opts: [
      { t: "I am — I am filling out this form as the principal applicant", a: "ok" },
      { t: "My spouse is the principal applicant — I am completing this on their behalf", a: "ok" },
      { t: "We are applying as co-investors (partnership application)", a: "ok" },
    ]
  },
];

function calculateScore(warnings: string[], attorneyFlags: string[]): number {
  let score = 100;
  score -= warnings.length * 4;
  score -= attorneyFlags.length * 8;
  return Math.max(score, 0);
}

function getOutcome(warnings: string[], attorneyFlags: string[]): string {
  if (attorneyFlags.length >= 2) return "ATTORNEY_RECOMMENDED";
  if (attorneyFlags.length === 1) return "ATTORNEY_RECOMMENDED";
  if (warnings.length > 0) return "PROCEED_RISK";
  return "PROCEED";
}

export default function QuizPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(true);
  const authCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [stopCode, setStopCode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [attorneyFlags, setAttorneyFlags] = useState<string[]>([]);
  const [franchiseInterest, setFranchiseInterest] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [multiSel, setMultiSel] = useState<number[]>([]);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [caslConsent, setCaslConsent] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [returnToResults, setReturnToResults] = useState(false);

  const visibleQuestions = QUESTIONS.filter(q => {
    if ('showIf' in q && typeof q.showIf === 'function') {
      return q.showIf(answers);
    }
    return true;
  });
  const q = visibleQuestions[cur];

  const qWithOpts = q as typeof QUESTIONS[0] & { opts?: { t: string; a?: string; w?: string; code?: string }[] };

  const displayOpts = (() => {
    if (q.id === "Q0-14e") {
      const country = (answers["Q0-01"] as string) || "your country";
      return [
        { t: `${country} — I am the majority or equal owner`, a: "ok" },
        { t: "My partner's country — they are the majority owner", a: "ok" },
        { t: "We have equal ownership — either nationality could work", a: "ok", w: "Under 9 FAM, if a business is equally owned by nationals of two different treaty countries, E-2 visas may be issued to employees of either treaty country. However, you should pick one designation for the business and keep it consistent across all documents." },
        { t: "I am not sure — we need to decide this", a: "attorney" },
      ];
    }
    return qWithOpts.opts || [];
  })();

  useEffect(() => {
    authCheckTimeout.current = setTimeout(() => {
      setAuthChecked(true);
    }, 1000);

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
        if (user) {
          setLoggedInUser({ id: user.id, email: user.email || "" });
          const { data: existing } = await supabase
            .from("quiz_sessions")
            .select("id, outcome")
            .eq("user_id", user.id)
            .not("outcome", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (existing) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
      } finally {
        setAuthChecked(true);
        const draft = localStorage.getItem('e2go_quiz_draft');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            const savedAt = new Date(parsed.savedAt);
            const daysSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 7 && parsed.answers && Object.keys(parsed.answers).length > 0) {
              setAnswers(parsed.answers);
              setCur(parsed.cur || 0);
              setWarnings(parsed.warnings || []);
              setAttorneyFlags(parsed.attorneyFlags || []);
              setFranchiseInterest(parsed.franchiseInterest || false);
            }
          } catch {
            localStorage.removeItem('e2go_quiz_draft');
          }
        }
        const jumpTo = localStorage.getItem('quiz_jump_to');
        if (jumpTo !== null) {
          const idx = parseInt(jumpTo, 10);
          if (!isNaN(idx)) {
            setCur(idx);
            setReturnToResults(true);
          }
          localStorage.removeItem('quiz_jump_to');
        }
      }
    };
    checkAuth();
    return () => {
      if (authCheckTimeout.current) clearTimeout(authCheckTimeout.current);
    };
  }, [supabase, router]);

  useEffect(() => {
    if (highlightedIdx >= 0) {
      const el = document.getElementById(`country-option-${highlightedIdx}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFirstQuestionOfSection = (secIdx: number) => {
    return visibleQuestions.findIndex(q => q.sec === secIdx);
  };

  const advance = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setCur(prev => {
        const next = prev + 1;
        if (next >= visibleQuestions.length) {
          return prev;
        }
        return next;
      });
      setSelectedIdx(null);
      setWarnMsg(null);
      setMultiSel([]);
    }, 200);
  }, [visibleQuestions.length]);

  const handleComplete = useCallback(async (finalAnswers: Record<string, Answer>, finalWarnings: string[], finalAttorneyFlags: string[], finalFranchise: boolean) => {
    const score = calculateScore(finalWarnings, finalAttorneyFlags);
    const outcome = getOutcome(finalWarnings, finalAttorneyFlags);

    const resultData = {
      outcome,
      score,
      warnings: finalWarnings,
      attorney_flags: finalAttorneyFlags,
      franchise_interest: finalFranchise,
      answers: finalAnswers,
      country: finalAnswers["Q0-01"] as string || "",
      investment_range: finalAnswers["Q0-04"] as string || "",
      application_type: (finalAnswers["Q0-15"] as string || "").includes("partner") ? "partnership" : "solo",
      dependents: finalAnswers["Q0-16"] as string || "Just me — no dependents",
    };

    localStorage.setItem("e2go_quiz_result", JSON.stringify(resultData));
    localStorage.removeItem('e2go_quiz_draft');

    if (returnToResults) {
      router.push("/results?from=quiz");
      return;
    }

    if (loggedInUser) {
      setIsSaving(true);
      try {
        await supabase.from("quiz_sessions").insert({
          user_id: loggedInUser.id,
          email: loggedInUser.email,
          outcome,
          score,
          hard_stop_codes: [],
          attorney_flag_codes: finalAttorneyFlags,
          risk_flag_codes: finalWarnings,
          application_type: resultData.application_type,
          franchise_interest: finalFranchise,
          result_json: resultData,
          casl_consent: true,
          casl_consent_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch {
      } finally {
        setIsSaving(false);
      }
      router.push("/results?from=quiz");
    } else {
      setShowEmailGate(true);
    }
  }, [loggedInUser, supabase, router]);

  const handleSelectOpt = useCallback((idx: number) => {
    if (!q || q.type !== "select") return;
    const opt = displayOpts[idx];
    if (!opt) return;

    setSelectedIdx(idx);
    const newAnswers = { ...answers, [q.id]: opt.t };
    setAnswers(newAnswers);
    localStorage.setItem('e2go_quiz_draft', JSON.stringify({
      answers: newAnswers,
      cur: cur,
      warnings: warnings,
      attorneyFlags: attorneyFlags,
      franchiseInterest: franchiseInterest,
      savedAt: new Date().toISOString(),
    }));

    if (opt.a === "stop") {
      setTimeout(() => setStopCode(opt.code || ""), 280);
      return;
    }

    if (opt.w) {
      const newWarns = [...warnings, opt.w];
      setWarnings(newWarns);
      setWarnMsg(opt.w);
      setTimeout(() => {
        const nextIdx = cur + 1;
        if (nextIdx >= visibleQuestions.length) {
          handleComplete(newAnswers, newWarns, attorneyFlags, franchiseInterest);
        } else {
          advance();
        }
      }, 1200);
      return;
    }

    if (opt.a === "attorney") {
      const newFlags = [...attorneyFlags, opt.t];
      setAttorneyFlags(newFlags);
      setTimeout(() => {
        const nextIdx = cur + 1;
        if (nextIdx >= visibleQuestions.length) {
          handleComplete(newAnswers, warnings, newFlags, franchiseInterest);
        } else {
          advance();
        }
      }, 1200);
      return;
    }

    if (opt.a === "franchise_yes") {
      setFranchiseInterest(true);
    }

    const hasSubQ = opt.a === "sub08a" || opt.a === "sub16a" || opt.a === "sub14b" || opt.a === "sub03a";
    if (hasSubQ) {
      setTimeout(() => {
        const subId = opt.a === "sub08a" ? "Q0-08a" : opt.a === "sub14b" ? "Q0-14b" : opt.a === "sub03a" ? "Q0-03a" : "Q0-16a";
        const subIdx = visibleQuestions.findIndex(x => x.id === subId);
        if (subIdx !== -1) {
          setIsAnimating(true);
          setTimeout(() => { setIsAnimating(false); setCur(subIdx); setSelectedIdx(null); setWarnMsg(null); }, 200);
        }
      }, 280);
      return;
    }

    if (opt.a === "broker") {
      setTimeout(() => {
        const brokerIdx = visibleQuestions.findIndex(x => x.id === "Q0-08b");
        if (brokerIdx !== -1) {
          setIsAnimating(true);
          setTimeout(() => { setIsAnimating(false); setCur(brokerIdx); setSelectedIdx(null); setWarnMsg(null); }, 200);
        }
      }, 280);
      return;
    }

    setTimeout(() => {
      if (returnToResults) {
        handleComplete(newAnswers, warnings, attorneyFlags, franchiseInterest);
        return;
      }
      const nextIdx = cur + 1;
      if (nextIdx >= visibleQuestions.length) {
        handleComplete(newAnswers, warnings, attorneyFlags, franchiseInterest);
      } else {
        advance();
      }
    }, 280);
  }, [q, answers, warnings, attorneyFlags, franchiseInterest, cur, visibleQuestions, advance, handleComplete, returnToResults, displayOpts]);

  const handleMultiContinue = useCallback(() => {
    if (multiSel.length === 0) return;
    if (!q) return;
    const opts = (q as typeof QUESTIONS[0] & { opts: { t: string }[] }).opts;
    const selected = multiSel.map(i => opts[i].t);
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    localStorage.setItem('e2go_quiz_draft', JSON.stringify({
      answers: newAnswers,
      cur: cur,
      warnings: warnings,
      attorneyFlags: attorneyFlags,
      franchiseInterest: franchiseInterest,
      savedAt: new Date().toISOString(),
    }));
    const nextIdx = cur + 1;
    if (nextIdx >= visibleQuestions.length) {
      handleComplete(newAnswers, warnings, attorneyFlags, franchiseInterest);
    } else {
      advance();
    }
  }, [multiSel, q, answers, cur, visibleQuestions, warnings, attorneyFlags, franchiseInterest, advance, handleComplete]);

  const handleEmailSubmit = useCallback(async () => {
    if (!email || !email.includes("@")) return;
    setIsSaving(true);
    setSaveError(null);

    const stored = localStorage.getItem("e2go_quiz_result");
    const resultData = stored ? JSON.parse(stored) : {};

    try {
      const { data: session, error } = await supabase.from("quiz_sessions").insert({
        user_id: null,
        email,
        outcome: resultData.outcome || "PROCEED",
        score: resultData.score || 80,
        hard_stop_codes: [],
        attorney_flag_codes: resultData.attorney_flags || [],
        risk_flag_codes: resultData.warnings || [],
        application_type: resultData.application_type || "solo",
        franchise_interest: resultData.franchise_interest || false,
        result_json: resultData,
        casl_consent: caslConsent,
        casl_consent_at: caslConsent ? new Date().toISOString() : null,
        completed_at: new Date().toISOString(),
      }).select("id").single();

      if (!error && session) {
        try {
          await fetch("/api/email/results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              outcome: resultData.outcome,
              result_json: resultData,
              quiz_session_id: session.id,
              franchise_interest: resultData.franchise_interest,
            }),
          });
        } catch {
        }
      }
    } catch {
      setSaveError("Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
    router.push("/results?from=quiz");
  }, [email, caslConsent, supabase, router]);

  const pct = Math.round(((cur + 1) / visibleQuestions.length) * 100);

  const S = SECTIONS[q?.sec ?? 0];

  if (!authChecked) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (stopCode) {
    const stop = HARD_STOPS[stopCode] || { title: "Not eligible at this time", body: "Based on your answers, we are unable to proceed. Please consult a qualified immigration attorney." };
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "clamp(32px, 5vw, 56px) clamp(16px, 5vw, 40px)", maxWidth: "560px" }}>
          <div style={{ width: "44px", height: "44px", border: "1px solid rgba(220,60,60,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", color: "rgba(220,60,60,0.65)", fontSize: "20px" }}>✕</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", lineHeight: 1.3 }}>{stop.title}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)", lineHeight: 1.7, marginBottom: "28px", maxWidth: "460px" }}>{stop.body}</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => { setStopCode(null); setCur(0); setAnswers({}); setWarnings([]); setAttorneyFlags([]); setFranchiseInterest(false); setSelectedIdx(null); setWarnMsg(null); setSelectedCountry(null); setCountrySearch(""); localStorage.removeItem('e2go_quiz_draft'); }} style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start over</button>
            <button style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.15)", color: "rgba(245,240,232,0.35)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Find an attorney →</button>
          </div>
        </div>
      </div>
    );
  }

  if (showEmailGate) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
        <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        </div>
        <div style={{ padding: "clamp(32px, 5vw, 56px) clamp(16px, 5vw, 40px)", maxWidth: "480px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px" }}>Your result is ready</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.3 }}>Where should we send your eligibility summary?</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>We will email you a full copy of your result and your personalised next-step summary.</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: "100%", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "12px" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }} onClick={() => setCaslConsent(!caslConsent)}>
            <div style={{ width: "16px", height: "16px", border: `1px solid ${caslConsent ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, background: caslConsent ? "#C9A84C" : "transparent", flexShrink: 0, marginTop: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {caslConsent && <span style={{ color: "#0a0a0a", fontSize: "11px" }}>✓</span>}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6 }}>Send me occasional updates about the E-2 process. You can unsubscribe at any time.</div>
          </div>
          {saveError && <div style={{ fontSize: "13px", color: "rgba(220,60,60,0.8)", marginBottom: "12px" }}>{saveError}</div>}
          <button onClick={handleEmailSubmit} disabled={!email.includes("@") || isSaving} style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: email.includes("@") && !isSaving ? "pointer" : "not-allowed", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: email.includes("@") && !isSaving ? 1 : 0.35 }}>
            {isSaving ? "Saving..." : "View my result →"}
          </button>
          <button onClick={() => router.push("/results?from=quiz")} style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: "rgba(245,240,232,0.25)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif", marginTop: "8px" }}>Skip — view result without saving</button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading...</div>
      </div>
    );
  }

  const isCountry = q.type === "country";
  const isMulti = q.type === "multi";
  const isSelect = q.type === "select";
  const filteredCountries = countrySearch.length > 0
    ? TREATY_COUNTRIES.filter(c => c.toLowerCase().startsWith(countrySearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8", maxWidth: "100%", margin: "0 auto" }}>
      <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ flex: 1, maxWidth: "clamp(100px, 30vw, 240px)", margin: "0 clamp(12px, 3vw, 24px)" }}>
          <div style={{ height: "1px", background: "rgba(201,168,76,0.15)" }}>
            <div style={{ height: "100%", background: "#C9A84C", width: `${pct}%`, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.65)", marginTop: "5px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Question {cur + 1} of {CORE_QUESTION_COUNT}</div>
        </div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(245,240,232,0.85)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(245,240,232,0.55)"}>Save & exit</div>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.08)", overflowX: "auto", whiteSpace: "nowrap" }}>
        {SECTIONS.map((s, i) => (
          <div key={s} onClick={i < q.sec ? () => { const firstQ = getFirstQuestionOfSection(i); if (firstQ !== -1) { setCur(firstQ); setSelectedIdx(null); setWarnMsg(null); setMultiSel([]); } } : undefined} onMouseEnter={i < q.sec ? e => e.currentTarget.style.color = "rgba(245,240,232,0.65)" : undefined} onMouseLeave={i < q.sec ? e => e.currentTarget.style.color = "rgba(245,240,232,0.45)" : undefined} style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: i === q.sec ? "#C9A84C" : i < q.sec ? "rgba(245,240,232,0.45)" : "rgba(245,240,232,0.4)", padding: "10px 0", marginRight: "18px", borderBottom: `2px solid ${i === q.sec ? "#C9A84C" : i < q.sec ? "rgba(201,168,76,0.25)" : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap", cursor: i < q.sec ? "pointer" : "default" }}>{s}</div>
        ))}
      </div>
      <div style={{ padding: "0 clamp(16px, 5vw, 40px)", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#C9A84C", padding: "10px 0" }}>Section {q.sec + 1} of 6 — {SECTIONS[q.sec]}</div>
      </div>

      <div style={{ padding: "clamp(28px, 5vw, 44px) clamp(16px, 5vw, 40px) 32px", maxWidth: "580px", width: "100%", opacity: isAnimating ? 0 : 1, transition: "opacity 0.15s" }}>
        {cur > 0 && (
          <button
            onClick={() => {
              setCur(c => c - 1);
              setSelectedIdx(null);
              setWarnMsg(null);
              setMultiSel([]);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'rgba(245,240,232,0.55)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: '24px',
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,240,232,0.85)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.55)'}
          >
            ← Back
          </button>
        )}

        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.7)", marginBottom: "18px" }}>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#C9A84C" }} />
          {q.isSub ? "Follow-up" : S}
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.3, marginBottom: "8px", letterSpacing: "-0.01em" }}>{q.q}</div>
        {q.help && <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.65, marginBottom: "28px", maxWidth: "460px" }}>{q.help}</div>}

        {warnMsg && (
          <div style={{ display: "flex", gap: "9px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.22)", background: "rgba(201,168,76,0.04)", marginBottom: "16px" }}>
            <div style={{ color: "#C9A84C", fontSize: "14px", flexShrink: 0 }}>!</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6 }}>{warnMsg}</div>
          </div>
        )}

        {isCountry && (
          <>
            <input
              value={countrySearch}
              onChange={e => { setCountrySearch(e.target.value); setSelectedCountry(null); setHighlightedIdx(-1); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIdx(prev => Math.min(prev + 1, filteredCountries.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIdx(prev => Math.max(prev - 1, 0));
                }
                if (e.key === 'Enter' && highlightedIdx >= 0) {
                  e.preventDefault();
                  const country = filteredCountries[highlightedIdx];
                  setSelectedCountry(country);
                  setCountrySearch(country);
                  setAnswers(prev => ({ ...prev, [q.id]: country }));
                  setTimeout(() => advance(), 300);
                }
                if (e.key === 'Escape') {
                  setCountrySearch('');
                  setHighlightedIdx(-1);
                }
              }}
              placeholder="Search your country..."
              style={{ width: "100%", maxWidth: "420px", padding: "13px 16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "8px" }}
            />
            {filteredCountries.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px", background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.2)", zIndex: 50, position: "relative" }}>
                {filteredCountries.map((c, idx) => (
                  <div key={c} id={`country-option-${idx}`} onClick={() => {
                    setSelectedCountry(c);
                    setCountrySearch(c);
                    setAnswers(prev => ({ ...prev, [q.id]: c }));
                    setTimeout(() => advance(), 300);
                  }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.08)"; e.currentTarget.style.color = "#f5f0e8"; }} onMouseLeave={e => { e.currentTarget.style.background = highlightedIdx === idx ? "rgba(201,168,76,0.15)" : selectedCountry === c ? "rgba(201,168,76,0.08)" : "#0a0a0a"; e.currentTarget.style.color = "#f5f0e8"; }} style={{ padding: "10px 14px", background: highlightedIdx === idx ? "rgba(201,168,76,0.15)" : selectedCountry === c ? "rgba(201,168,76,0.08)" : "#0a0a0a", border: `1px solid ${selectedCountry === c ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.1)"}`, color: "#f5f0e8", fontSize: "13px", cursor: "pointer", transition: "all 0.12s", borderRadius: 0 }}>{c}</div>
                ))}
              </div>
            )}
          </>
        )}

        {isSelect && displayOpts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
            {displayOpts.map((o, i) => (
              <button key={i} onClick={() => handleSelectOpt(i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: selectedIdx === i ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)", border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.14)"}`, color: selectedIdx === i ? "#f5f0e8" : "rgba(245,240,232,0.75)", fontSize: "14px", cursor: "pointer", textAlign: "left", borderRadius: 0, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "all 0.14s", gap: "12px" }}>
                <span>{o.t}</span>
                <div style={{ width: "16px", height: "16px", border: `1px solid ${selectedIdx === i ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedIdx === i && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                </div>
              </button>
            ))}
          </div>
        )}

        {isMulti && displayOpts.length > 0 && (
          <>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", marginBottom: "14px", letterSpacing: "0.04em" }}>Select all that apply</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginBottom: "28px" }}>
              {displayOpts.map((o, i) => {
                const sel = multiSel.includes(i);
                return (
                  <button key={i} onClick={() => {
                    setMultiSel(prev => sel ? prev.filter(x => x !== i) : [...prev, i]);
                  }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: sel ? "rgba(201,168,76,0.09)" : "rgba(201,168,76,0.02)", border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.14)"}`, color: sel ? "#f5f0e8" : "rgba(245,240,232,0.75)", fontSize: "14px", cursor: "pointer", textAlign: "left", borderRadius: 0, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "all 0.14s", gap: "12px" }}>
                    <span>{o.t}</span>
                    <div style={{ width: "16px", height: "16px", border: `1px solid ${sel ? "#C9A84C" : "rgba(201,168,76,0.35)"}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sel && <div style={{ width: "7px", height: "7px", background: "#C9A84C" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button onClick={handleMultiContinue} disabled={multiSel.length === 0} style={{ padding: "11px 26px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: multiSel.length > 0 ? "pointer" : "not-allowed", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: multiSel.length > 0 ? 1 : 0.25 }}>Continue</button>
            </div>
          </>
        )}

        {(isSelect || isCountry) && warnMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
            <button onClick={() => {
              const nextIdx = cur + 1;
              if (nextIdx >= visibleQuestions.length) {
                handleComplete(answers, warnings, attorneyFlags, franchiseInterest);
              } else {
                advance();
              }
            }} style={{ padding: "11px 26px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Continue anyway</button>
          </div>
        )}

        {q.tip && (
          <div style={{ display: "flex", gap: "8px", marginTop: "22px", padding: "11px 14px", border: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "13px", color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>i</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", lineHeight: 1.65 }}>{q.tip}</div>
          </div>
        )}
      </div>
    </div>
  );
}
