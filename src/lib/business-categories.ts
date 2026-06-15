export const BUSINESS_CATEGORIES = [
  { value: 'senior_care', label: 'Senior Care / Home Health' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'commercial_cleaning', label: 'Commercial Cleaning' },
  { value: 'it_consulting', label: 'IT Consulting / Tech' },
  { value: 'restaurant', label: 'Restaurant / Food Service' },
  { value: 'retail', label: 'Retail' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'consulting', label: 'Professional Consulting' },
  { value: 'import_export', label: 'Import / Export' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'healthcare', label: 'Healthcare / Medical' },
  { value: 'education', label: 'Education / Training' },
  { value: 'other', label: 'Other' },
] as const;

export function getBusinessCategoryLabel(value: string): string {
  return BUSINESS_CATEGORIES.find(c => c.value === value)?.label || value;
}
