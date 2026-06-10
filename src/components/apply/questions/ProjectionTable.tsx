'use client';

import { useState, useCallback } from 'react';

interface ProjectionRow {
  year: number;
  revenue: string;
  netIncome: string;
  employees: string;
}

interface ProjectionTableProps {
  value: ProjectionRow[];
  onChange: (rows: ProjectionRow[]) => void;
}

const DEFAULT_ROWS: ProjectionRow[] = [
  { year: 1, revenue: '', netIncome: '', employees: '' },
  { year: 2, revenue: '', netIncome: '', employees: '' },
  { year: 3, revenue: '', netIncome: '', employees: '' },
  { year: 4, revenue: '', netIncome: '', employees: '' },
  { year: 5, revenue: '', netIncome: '', employees: '' },
];

export default function ProjectionTable({ value, onChange }: ProjectionTableProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const rows = value.length > 0 ? value : DEFAULT_ROWS;

  const updateCell = useCallback((year: number, field: keyof Omit<ProjectionRow, 'year'>, val: string) => {
    const updated = rows.map((row) =>
      row.year === year ? { ...row, [field]: val } : row
    );
    onChange(updated);
  }, [rows, onChange]);

  return (
    <div className="overflow-x-auto">
      {/* Desktop table */}
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr>
            <th
              className="border px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em]"
              style={{
                borderColor: 'rgba(201,168,76,0.12)',
                color: 'rgba(245,240,232,0.28)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Year
            </th>
            {['Revenue (USD)', 'Net Income (USD)', 'Employees'].map((header) => (
              <th
                key={header}
                className="border px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em]"
                style={{
                  borderColor: 'rgba(201,168,76,0.12)',
                  color: 'rgba(245,240,232,0.28)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <td
                className="border px-3 py-2 text-[13px]"
                style={{
                  borderColor: 'rgba(201,168,76,0.12)',
                  color: 'rgba(245,240,232,0.55)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Year {row.year}
              </td>
              {(['revenue', 'netIncome', 'employees'] as const).map((field) => {
                const cellId = `${row.year}-${field}`;
                const isFocused = focusedCell === cellId;
                return (
                  <td
                    key={field}
                    className="border p-0"
                    style={{ borderColor: 'rgba(201,168,76,0.12)' }}
                  >
                    <input
                      type="text"
                      value={row[field]}
                      onChange={(e) => updateCell(row.year, field, e.target.value)}
                      onFocus={() => setFocusedCell(cellId)}
                      onBlur={() => setFocusedCell(null)}
                      placeholder={field === 'employees' ? '0' : '0'}
                      className="w-full bg-transparent px-3 py-2 text-[13px] outline-none"
                      style={{
                        color: '#f5f0e8',
                        borderColor: isFocused ? 'rgba(201,168,76,0.5)' : 'transparent',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.year}
            className="border p-4"
            style={{ borderColor: 'rgba(201,168,76,0.12)' }}
          >
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.1em]"
              style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
            >
              Year {row.year}
            </p>
            <div className="space-y-3">
              {(['revenue', 'netIncome', 'employees'] as const).map((field) => {
                const labels = { revenue: 'Revenue (USD)', netIncome: 'Net Income (USD)', employees: 'Employees' };
                const cellId = `mobile-${row.year}-${field}`;
                const isFocused = focusedCell === cellId;
                return (
                  <div key={field}>
                    <label
                      className="mb-1 block text-[9px] uppercase tracking-[0.1em]"
                      style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {labels[field]}
                    </label>
                    <input
                      type="text"
                      value={row[field]}
                      onChange={(e) => updateCell(row.year, field, e.target.value)}
                      onFocus={() => setFocusedCell(cellId)}
                      onBlur={() => setFocusedCell(null)}
                      placeholder={field === 'employees' ? '0' : '0'}
                      className="w-full border bg-transparent px-3 py-2 text-[13px] outline-none"
                      style={{
                        borderColor: isFocused ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.12)',
                        color: '#f5f0e8',
                        fontFamily: "'DM Sans', sans-serif",
                        borderRadius: 0,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
