"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Is this a law firm?",
    answer: "No. e2go prepares documents. What you do with your finished package is entirely up to you. If you choose to have an immigration consultant review it at this stage, it's a 2-hour job — not a 20-hour one.",
  },
  {
    question: "What if I'm denied?",
    answer: "We test every document against 15 real denial patterns before you ever see them. We can't guarantee an outcome — no one can. But we can make sure your preparation isn't the reason.",
  },
  {
    question: "How is this different from hiring a consultant?",
    answer: "A consultant works on one case at a time, in their own way. e2go applies the same preparation discipline to every case, every time — tested against every denial pattern in our knowledge base and reviewed by you before a single document leaves the platform.",
  },
  {
    question: "Is my data secure?",
    answer: "We never store your passports, bank statements, or financial records. Only your answers. Your documents are generated, reviewed by you, and downloaded. They belong to you entirely.",
  },
  {
    question: "What countries are eligible?",
    answer: "E-2 is available to citizens of 82 treaty countries. Our eligibility quiz confirms your specific country and consulate in the first question — it takes under a minute.",
  },
  {
    question: "How long does the whole process take?",
    answer: "Your documents are typically ready within days of completing your application profile. The overall timeline — business formation, consulate appointment, visa processing — depends on your starting point. Our journey planner shows you a personalised timeline the moment you complete the quiz.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="w-full py-20 px-4 bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[#C9A84C] text-[11px] uppercase tracking-[0.18em] font-['DM_Sans'] font-medium mb-4">
            Common questions
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-[#f5f0e8] font-['Cormorant_Garamond']">
            Everything you need to know.
          </h2>
        </div>

        {/* FAQ List */}
        <div className="space-y-0">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="border-b border-[rgba(201,168,76,0.12)]"
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(index)}
                  className="w-full flex justify-between items-center py-5 text-left group transition-colors duration-150"
                >
                  <span className="text-[15px] font-normal text-[#f5f0e8] group-hover:text-[#C9A84C] transition-colors duration-150 font-['DM_Sans'] pr-4">
                    {item.question}
                  </span>
                  <span
                    className={`flex-shrink-0 text-[#C9A84C] transition-transform duration-300 font-['DM_Sans'] text-xl ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pb-5 pr-4">
                    <p className="text-[14px] font-light text-[rgba(245,240,232,0.60)] leading-[1.7] font-['DM_Sans']">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
