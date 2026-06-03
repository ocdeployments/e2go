'use client';

import { useRef } from 'react';

interface Section {
  id: string;
  title: string;
  icon?: string;
  questionCount: number;
  answeredCount: number;
}

interface TabSidebarProps {
  sections: Section[];
  activeSectionId: string;
  onSectionClick: (sectionId: string) => void;
}

function CompletionRing({ answered, total }: { answered: number; total: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? answered / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const isComplete = answered >= total && total > 0;

  return (
    <div className="relative w-7 h-7">
      <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="rgba(201,168,76,0.15)"
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={isComplete ? '#C9A84C' : '#C9A84C'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          style={{
            filter: isComplete ? 'none' : 'drop-shadow(0 0 3px rgba(201,168,76,0.4))',
          }}
        />
        {isComplete && (
          <g className="transform scale-50">
            <path
              d="M12 18L16 22L24 14"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function TabSidebar({
  sections,
  activeSectionId,
  onSectionClick,
}: TabSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  const totalQuestions = sections.reduce((acc, s) => acc + s.questionCount, 0);
  const totalAnswered = sections.reduce((acc, s) => acc + s.answeredCount, 0);
  const overallProgressPercent = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  return (
    <aside
      ref={sidebarRef}
      className="w-[280px] h-screen sticky top-0 flex flex-col"
      style={{
        background: '#0a0a0a',
        borderRight: '1px solid rgba(201,168,76,0.1)',
      }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <h3
          className="text-xs uppercase tracking-widest mb-4"
          style={{ color: 'rgba(245,240,232,0.4)' }}
        >
          Progress
        </h3>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(201,168,76,0.15)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${overallProgressPercent}%`,
              background: 'linear-gradient(90deg, #C9A84C 0%, #D4B85C 100%)',
              boxShadow: '0 0 10px rgba(201,168,76,0.5)',
            }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'rgba(245,240,232,0.5)' }}>
          {totalAnswered} of {totalQuestions} questions completed
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId;

            return (
              <li key={section.id}>
                <button
                  onClick={() => onSectionClick(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                    isActive ? 'border-l-2' : ''
                  }`}
                  style={{
                    borderLeftColor: isActive ? '#C9A84C' : 'transparent',
                    background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                  }}
                >
                  <CompletionRing
                    answered={section.answeredCount}
                    total={section.questionCount}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm truncate"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: isActive ? 500 : 400,
                        fontStyle: isActive ? 'italic' : 'normal',
                        color: isActive ? '#f5f0e8' : 'rgba(245,240,232,0.6)',
                      }}
                    >
                      {section.title}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(245,240,232,0.4)' }}>
                      {section.answeredCount} of {section.questionCount} questions
                    </div>
                  </div>
                  {isActive && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: '#C9A84C' }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="text-xs" style={{ color: 'rgba(245,240,232,0.4)' }}>
          Tab A • Module 3
        </div>
      </div>
    </aside>
  );
}