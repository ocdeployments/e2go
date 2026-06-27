import { createSupabaseServerClient } from './supabase-server';

export interface TimelineData {
  workingTargetDate: Date | null;
  confirmedInterviewDate: Date | null;
  deadlineMode: 'ranges' | 'specific';
}

export interface CalendarDisplayItem {
  itemType: string;
  dueDate: Date | null;
  rangeDescription?: string;
  anchorNote?: string;
  status: 'pending' | 'completed' | 'overdue';
}

export async function setWorkingTargetDate(
  applicationId: string,
  date: Date | null
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('applications')
    .update({ working_target_date: date ? date.toISOString().split('T')[0] : null })
    .eq('id', applicationId);
  if (error) throw error;
}

export async function setConfirmedInterviewDate(
  applicationId: string,
  date: Date
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('applications')
    .update({ confirmed_interview_date: date.toISOString().split('T')[0] })
    .eq('id', applicationId);
  if (error) throw error;

  await recalculateCalendarDeadlines(applicationId, date);
}

export async function getTimelineData(applicationId: string): Promise<TimelineData> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('applications')
    .select('working_target_date, confirmed_interview_date')
    .eq('id', applicationId)
    .single();

  if (error) throw error;

  return {
    workingTargetDate: data.working_target_date ? new Date(data.working_target_date) : null,
    confirmedInterviewDate: data.confirmed_interview_date ? new Date(data.confirmed_interview_date) : null,
    deadlineMode: data.confirmed_interview_date ? 'specific' : 'ranges',
  };
}

export async function recalculateCalendarDeadlines(
  applicationId: string,
  confirmedDate: Date
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const deadlines = [
    { itemType: 'ds_160_submission', daysBefore: 14 },
    { itemType: 'ds_156e_submission', daysBefore: 14 },
    { itemType: 'document_review_final', daysBefore: 21 },
    { itemType: 'interview_prep_complete', daysBefore: 7 },
    { itemType: 'package_printed_organised', daysBefore: 3 },
  ];

  const updates = deadlines.map((d) => {
    const dueDate = new Date(confirmedDate);
    dueDate.setDate(dueDate.getDate() - d.daysBefore);
    return supabase
      .from('calendar_items')
      .update({ due_date: dueDate.toISOString().split('T')[0], status: 'pending' })
      .eq('application_id', applicationId)
      .eq('item_type', d.itemType);
  });

  await Promise.all(updates);
}

export async function getCalendarDisplay(
  applicationId: string
): Promise<CalendarDisplayItem[]> {
  const timeline = await getTimelineData(applicationId);
  const supabase = await createSupabaseServerClient();

  const { data: items, error } = await supabase
    .from('calendar_items')
    .select('item_type, due_date, status')
    .eq('application_id', applicationId)
    .order('due_date', { ascending: true });

  if (error) throw error;

  const formattedItems = items.map((item: { item_type: string; due_date: string | null; status: "pending" | "completed" | "overdue" }) => {
    if (timeline.deadlineMode === 'ranges') {
      const daysMap: Record<string, number> = {
        ds_160_submission: 14,
        ds_156e_submission: 14,
        document_review_final: 21,
        interview_prep_complete: 7,
        package_printed_organised: 3,
      };
      const weeks = Math.ceil((daysMap[item.item_type] || 14) / 7);
      return {
        itemType: item.item_type,
        dueDate: null,
        rangeDescription: `Approximately ${weeks} week${weeks > 1 ? 's' : ''} before your interview`,
        status: 'pending' as const,
      };
    }

    return {
      itemType: item.item_type,
      dueDate: item.due_date ? new Date(item.due_date) : null,
      anchorNote: `Calculated from your confirmed interview date of ${timeline.confirmedInterviewDate?.toLocaleDateString()}`,
      status: item.status || 'pending',
    };
  });

  return formattedItems;
}
