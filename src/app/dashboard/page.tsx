import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

// Dashboard is now /case-profile — this redirect preserves existing bookmarks
export default function DashboardPage() {
  redirect('/case-profile');
}
