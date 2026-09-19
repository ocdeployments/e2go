import { notFound } from 'next/navigation';
import { getBrandBySlug } from '@/data/franchise-brands';

interface BrandLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

// The brand page itself is a client component, so an unknown slug used to render
// "Brand not found." with HTTP 200 (a soft 404). Resolving the slug here lets
// Next.js answer with a real 404.
export default function FranchiseBrandLayout({ children, params }: BrandLayoutProps): React.ReactNode {
  if (!getBrandBySlug(params.slug)) {
    notFound();
  }
  return children;
}
