import Link from "next/link";

interface BrandedMessagePageProps {
  heading: string;
  description: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  children?: React.ReactNode;
}

export default function BrandedMessagePage({
  heading,
  description,
  primaryAction,
  secondaryAction,
  children,
}: BrandedMessagePageProps) {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4 py-16"
      style={{ background: "#0a0a0a" }}
    >
      <div
        className="w-full max-w-lg p-8 text-center"
        style={{
          background: "rgba(201,168,76,0.02)",
          border: "1px solid rgba(201,168,76,0.12)",
          borderRadius: 0,
        }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(201,168,76,0.08)" }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: "#C9A84C" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.34 20.5h17.32a1.5 1.5 0 001.23-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z"
            />
          </svg>
        </div>

        <h1
          className="text-xl mb-3"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#f5f0e8",
            fontSize: "24px",
          }}
        >
          {heading}
        </h1>

        <p
          className="mb-6"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            fontSize: "14px",
            lineHeight: 1.7,
            color: "rgba(245,240,232,0.6)",
          }}
        >
          {description}
        </p>

        {children}

        <div className="flex flex-col gap-3 mt-4">
          <Link
            href={primaryAction.href}
            className="block w-full py-3 text-center font-medium transition-colors"
            style={{
              background: "#C9A84C",
              color: "#0a0a0a",
              borderRadius: 0,
              fontSize: "14px",
              letterSpacing: "0.04em",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
            }}
          >
            {primaryAction.label}
          </Link>

          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="block w-full py-3 text-center font-medium transition-colors"
              style={{
                background: "transparent",
                color: "rgba(245,240,232,0.72)",
                border: "1px solid rgba(201,168,76,0.2)",
                borderRadius: 0,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
