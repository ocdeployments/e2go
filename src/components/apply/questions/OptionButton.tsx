'use client';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function OptionButton({ label, selected, onClick, disabled }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full border px-4 py-3 text-left text-[13px] transition-colors disabled:opacity-50"
      style={{
        borderColor: selected ? '#C9A84C' : 'rgba(201,168,76,0.12)',
        backgroundColor: selected ? 'rgba(201,168,76,0.06)' : 'transparent',
        color: selected ? '#f5f0e8' : 'rgba(245,240,232,0.55)',
        fontFamily: "'DM Sans', sans-serif",
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );
}
