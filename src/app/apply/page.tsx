import { redirect } from 'next/navigation';

// The standalone /apply hub has been merged into /case-profile, which is now the
// single landing workspace. The case-file sections themselves still live at
// /apply/[section] (story, business, investment, qualifications, family, ties);
// only this index page is retired in favour of the unified case-profile view.
export default function ApplyIndexRedirect() {
  redirect('/case-profile');
}
