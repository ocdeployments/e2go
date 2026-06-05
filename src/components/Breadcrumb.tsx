import Link from "next/link";

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-8" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item.label} className="flex items-center gap-2">
            {index > 0 && <span className="text-[rgba(245,240,232,0.45)]">/</span>}
            {isLast ? (
              <span className="text-[#C9A84C]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[rgba(245,240,232,0.65)]">{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
