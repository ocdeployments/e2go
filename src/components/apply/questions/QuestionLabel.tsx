'use client';

interface QuestionLabelProps {
  children: string;
  required?: boolean;
}

export default function QuestionLabel({ children, required }: QuestionLabelProps) {
  return (
    <label
      className="mb-2 block text-[16px] font-light leading-[1.45]"
      style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
    >
      {children}
      {required && <span style={{ color: '#C9A84C' }}> *</span>}
    </label>
  );
}
