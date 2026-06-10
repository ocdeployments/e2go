'use client';

import { useState, useCallback } from 'react';
import AdvisoryBlock from './AdvisoryBlock';

interface CostRow {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface StartupCostTableProps {
  value: CostRow[];
  onChange: (rows: CostRow[]) => void;
  investmentAmount?: number;
}

let nextId = 1;
function generateId(): string {
  return `cost-${nextId++}`;
}

const DEFAULT_CATEGORIES = [
  'Franchise fee',
  'Equipment',
  'Leasehold improvements',
  'Initial inventory',
  'Working capital',
  'Professional fees',
  'Other',
];

export default function StartupCostTable({ value, onChange, investmentAmount }: StartupCostTableProps) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const rows = value.length > 0 ? value : DEFAULT_CATEGORIES.map((cat) => ({
    id: generateId(),
    category: cat,
    description: '',
    amount: '',
  }));

  const total = rows.reduce((sum, row) => {
    const amt = parseFloat(row.amount) || 0;
    return sum + amt;
  }, 0);

  const discrepancy = investmentAmount ? Math.abs(total - investmentAmount) / investmentAmount : 0;
  const showAdvisory = investmentAmount && discrepancy > 0.1 && total > 0;

  const updateRow = useCallback((id: string, field: keyof CostRow, val: string) => {
    const updated = rows.map((row) =>
      row.id === id ? { ...row, [field]: val } : row
    );
    onChange(updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    onChange([...rows, { id: generateId(), category: '', description: '', amount: '' }]);
  }, [rows, onChange]);

  const removeRow = useCallback((id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  }, [rows, onChange]);

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Category', 'Description', 'Amount (USD)', ''].map((header, i) => (
                <th
                  key={i}
                  className="border px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em]"
                  style={{
                    borderColor: 'rgba(201,168,76,0.12)',
                    color: 'rgba(245,240,232,0.28)',
                    fontFamily: "'DM Sans', sans-serif",
                    width: i === 2 ? '120px' : i === 3 ? '40px' : undefined,
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cellPrefix = row.id;
              return (
                <tr key={row.id}>
                  {(['category', 'description', 'amount'] as const).map((field) => {
                    const cellId = `${cellPrefix}-${field}`;
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
                          onChange={(e) => updateRow(row.id, field, e.target.value)}
                          onFocus={() => setFocusedCell(cellId)}
                          onBlur={() => setFocusedCell(null)}
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
                  <td
                    className="border p-0"
                    style={{ borderColor: 'rgba(201,168,76,0.12)' }}
                  >
                    <button
                      onClick={() => removeRow(row.id)}
                      className="flex h-full w-full items-center justify-center px-2 py-2 text-[11px] transition-colors hover:bg-[rgba(210,70,55,0.1)]"
                      style={{ color: 'rgba(210,70,55,0.6)' }}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={2}
                className="border px-3 py-2 text-right text-[11px] uppercase tracking-[0.1em]"
                style={{
                  borderColor: 'rgba(201,168,76,0.12)',
                  color: 'rgba(245,240,232,0.4)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Total
              </td>
              <td
                className="border px-3 py-2 text-[13px]"
                style={{
                  borderColor: 'rgba(201,168,76,0.12)',
                  color: '#C9A84C',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ${total.toLocaleString()}
              </td>
              <td
                className="border"
                style={{ borderColor: 'rgba(201,168,76,0.12)' }}
              />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            className="border p-4"
            style={{ borderColor: 'rgba(201,168,76,0.12)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <input
                type="text"
                value={row.category}
                onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                placeholder="Category"
                className="bg-transparent text-[11px] uppercase tracking-[0.1em] outline-none"
                style={{ color: 'rgba(245,240,232,0.55)', fontFamily: "'DM Sans', sans-serif" }}
              />
              <button
                onClick={() => removeRow(row.id)}
                className="text-[11px]"
                style={{ color: 'rgba(210,70,55,0.6)' }}
              >
                &times;
              </button>
            </div>
            <input
              type="text"
              value={row.description}
              onChange={(e) => updateRow(row.id, 'description', e.target.value)}
              placeholder="Description"
              className="mb-2 w-full bg-transparent text-[13px] outline-none"
              style={{ color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}
            />
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]"
                style={{ color: 'rgba(245,240,232,0.3)' }}
              >
                $
              </span>
              <input
                type="text"
                value={row.amount}
                onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                placeholder="0"
                className="w-full border bg-transparent py-2 pl-7 pr-3 text-[13px] outline-none"
                style={{
                  borderColor: 'rgba(201,168,76,0.12)',
                  color: '#f5f0e8',
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: 0,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add row + total */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={addRow}
          className="text-[11px] uppercase tracking-[0.1em] transition-colors hover:text-[#C9A84C]"
          style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
        >
          + Add item
        </button>
        <p
          className="text-[13px]"
          style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
        >
          Total: ${total.toLocaleString()}
        </p>
      </div>

      {/* Advisory if discrepancy */}
      {showAdvisory && (
        <AdvisoryBlock>
          Your itemised costs ({`$${total.toLocaleString()}`}) don&apos;t match your total
          investment ({`$${(investmentAmount || 0).toLocaleString()}`}). Officers check
          this. Adjust your figures before proceeding.
        </AdvisoryBlock>
      )}
    </div>
  );
}
