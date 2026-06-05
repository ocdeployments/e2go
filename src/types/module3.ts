export type FieldType = 'text' | 'textarea' | 'select' | 'multi_select' | 'date' | 'date_range' | 'currency' | 'percentage' | 'number';

export interface FieldConfig {
  key: string;
  type: FieldType;
  label: string;
  question?: string;
  helperText?: string;
  required: boolean;
  options?: { value: string; label: string; helperText?: string }[];
  placeholder?: string;
  privacy_category?: 'red' | 'amber' | 'green' | 'required';
  conditionField?: string;
  conditionValue?: string;
  prefillValue?: string | string[] | null;
  prefillNote?: string | null;
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

export interface Section {
  id: string;
  title: string;
  icon?: string;
  fields: FieldConfig[];
}

export interface TabPageProps {
  tabTitle: string;
  tabDescription: string;
  sections: Section[];
  answers: Record<string, string | string[] | number | null>;
  onAnswerChange: (key: string, value: string | string[] | number | null) => void;
  onSaveSection: (sectionId: string) => Promise<void>;
}

export interface SectionFormProps {
  sectionId: string;
  sectionTitle: string;
  fields: FieldConfig[];
  answers: Record<string, string | string[] | number | null>;
  onAnswerChange: (key: string, value: string | string[] | number | null) => void;
  onSave: () => Promise<void>;
  onSkipField?: (key: string) => void;
}

export interface FormFieldProps {
  field: FieldConfig;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number | null) => void;
  onSkip?: () => void;
  disabled?: boolean;
}