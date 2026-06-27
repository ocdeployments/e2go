import type { SimulatorContext } from '@/types/simulator';
import { BUSINESS_CATEGORIES } from './business-categories';

export type GapWriteTarget =
  | { table: 'answers'; questionKey: string }
  | { table: 'applications'; column: string };

export interface GapField {
  key: string;
  label: string;
  helpText?: string;
  type: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  writeTarget: GapWriteTarget;
  currentValue: string;
  missing: boolean;
}

const OPERATIONAL_STATUS_OPTIONS = [
  { value: 'pre_start', label: 'Not yet started — planning stage' },
  { value: 'operational', label: 'Already operating' },
  { value: 'not_yet_formed', label: 'Business entity not yet formed' },
];

// Static map of gap field key -> where its value gets written.
// Used by the case-gaps API to persist confirmed/filled-in values.
export const GAP_FIELD_WRITE_TARGETS: Record<string, GapWriteTarget> = {
  targetState: { table: 'answers', questionKey: 'QE-03' },
  businessCategory: { table: 'answers', questionKey: 'Q0-10' },
  investmentAmount: { table: 'answers', questionKey: 'QF-02' },
  revenueYear1: { table: 'answers', questionKey: 'QI-05' },
  employeeCountYear1: { table: 'answers', questionKey: 'QI-03' },
  operationalStatus: { table: 'applications', column: 'operational_status' },
  operatingName: { table: 'answers', questionKey: 'QF-09' },
};

/**
 * Builds the list of fields the simulator needs to run a personalized,
 * consistent interview. Each field is marked `missing` if the case file
 * doesn't yet have a real value for it (vs. a generic default).
 */
export function buildGapFields(context: SimulatorContext): GapField[] {
  return [
    {
      key: 'targetState',
      label: 'State where your business operates',
      type: 'text',
      writeTarget: GAP_FIELD_WRITE_TARGETS.targetState,
      currentValue: context.targetState || '',
      missing: !context.targetState,
    },
    {
      key: 'businessCategory',
      label: 'Business category',
      type: 'select',
      options: BUSINESS_CATEGORIES.map(c => ({ value: c.value, label: c.label })),
      writeTarget: GAP_FIELD_WRITE_TARGETS.businessCategory,
      currentValue: context.businessCategory === 'general' ? '' : context.businessCategory,
      missing: context.businessCategory === 'general',
    },
    {
      key: 'investmentAmount',
      label: 'Total investment amount (USD)',
      type: 'number',
      writeTarget: GAP_FIELD_WRITE_TARGETS.investmentAmount,
      currentValue: context.investmentAmount ? String(context.investmentAmount) : '',
      missing: context.investmentAmount === 0,
    },
    {
      key: 'revenueYear1',
      label: 'Projected Year 1 revenue (USD)',
      type: 'number',
      writeTarget: GAP_FIELD_WRITE_TARGETS.revenueYear1,
      currentValue: context.revenueYear1 ? String(context.revenueYear1) : '',
      missing: context.revenueYear1 === 0,
    },
    {
      key: 'employeeCountYear1',
      label: 'Planned employees by end of Year 1',
      type: 'number',
      writeTarget: GAP_FIELD_WRITE_TARGETS.employeeCountYear1,
      currentValue: context.employeeCountYear1 ? String(context.employeeCountYear1) : '',
      missing: context.employeeCountYear1 === 0,
    },
    {
      key: 'operationalStatus',
      label: 'Current operational status',
      type: 'select',
      options: OPERATIONAL_STATUS_OPTIONS,
      writeTarget: GAP_FIELD_WRITE_TARGETS.operationalStatus,
      currentValue: context.operationalStatus,
      missing: false,
    },
    {
      key: 'operatingName',
      label: 'Trade, franchise, or DBA name (if different from your legal business name)',
      helpText: 'Leave blank if your business operates under its legal name only.',
      type: 'text',
      writeTarget: GAP_FIELD_WRITE_TARGETS.operatingName,
      currentValue: context.operatingName || '',
      missing: false,
    },
  ];
}

export function hasRequiredGaps(fields: GapField[]): boolean {
  return fields.some(f => f.missing);
}
