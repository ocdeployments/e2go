const features = [
  {
    title: "Case analysis engine",
    description:
      "6 calculations. 15 denial pattern checks. Investment substantiality, source of funds strength, marginality risk — all assessed before a word is written.",
  },
  {
    title: "Sequential document generation",
    description:
      "Cover letter first. Each document reviewed before the next begins. Inconsistencies caught before they compound. You approve every document before downloading.",
  },
  {
    title: "Writing style matching",
    description:
      "Your documents read like you wrote them. A writing sample calibrates the engine to your natural voice. AI detection run on every document.",
  },
  {
    title: "Consulate intelligence",
    description:
      "Processing times, approval patterns, known preferences — specific to your consulate. Not generic advice.",
  },
  {
    title: "Interview simulator",
    description:
      "The AI officer has read your package. Questions are generated from your specific application. Every weak point is probed.",
  },
  {
    title: "Specialist referral network",
    description:
      "Franchise brokers, cross-border accountants, LLC formation specialists — connected at the right moment, already briefed on your situation.",
  },
];

function GoldDiamondIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#C9A84C]"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6L8 0Z" />
    </svg>
  );
}

export default function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, idx) => (
        <div
          key={idx}
          className="border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.02)] p-6 hover:border-[#C9A84C] transition-colors duration-200"
        >
          <div className="mb-4">
            <GoldDiamondIcon />
          </div>
          <h3 className="font-sans font-medium text-[#f5f0e8] text-lg mb-3">
            {feature.title}
          </h3>
          <p className="font-sans text-sm text-[rgba(245,240,232,0.5)] leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}