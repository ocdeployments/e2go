'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import TabSidebar from './TabSidebar';
import SectionForm from './SectionForm';
import { Section, TabPageProps } from '@/types/module3';

function MobileStepper({
  sections,
  activeSectionId,
  onSectionClick,
}: {
  sections: Section[];
  activeSectionId: string;
  onSectionClick: (sectionId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 overflow-x-auto"
      style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(201,168,76,0.1)' }}
    >
      {sections.map((section, index) => {
        const isActive = section.id === activeSectionId;

        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
              isActive ? 'border' : ''
            }`}
            style={{
              borderColor: isActive ? '#C9A84C' : 'transparent',
              background: isActive ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
              style={{
                background: isActive ? '#C9A84C' : 'rgba(201,168,76,0.2)',
                color: isActive ? '#0a0a0a' : 'rgba(245,240,232,0.6)',
              }}
            >
              {index + 1}
            </div>
            <span
              className="text-xs"
              style={{
                color: isActive ? '#f5f0e8' : 'rgba(245,240,232,0.5)',
              }}
            >
              {section.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function TabPage({
  tabTitle,
  tabDescription,
  sections,
  answers,
  onAnswerChange,
  onSaveSection,
}: TabPageProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id || '');
  const [isMobile, setIsMobile] = useState(false);
  const formAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSaveSection = useCallback(async (sectionId: string) => {
    await onSaveSection(sectionId);
  }, [onSaveSection]);

  const sectionProgress = sections.map(section => {
    const answeredCount = section.fields.filter(f => {
      const answer = answers[f.key];
      if (f.type === 'multi_select' && Array.isArray(answer)) {
        return answer.length > 0;
      }
      return answer !== undefined && answer !== null && answer !== '';
    }).length;
    return {
      id: section.id,
      title: section.title,
      questionCount: section.fields.length,
      answeredCount,
    };
  });

  return (
    <div className="flex min-h-screen" style={{ background: '#0a0a0a' }}>
      {!isMobile && (
        <TabSidebar
          sections={sectionProgress}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
        />
      )}

      <main className="flex-1 flex flex-col">
        {isMobile && (
          <MobileStepper
            sections={sections}
            activeSectionId={activeSectionId}
            onSectionClick={handleSectionClick}
          />
        )}

        <header
          className="px-6 py-4 border-b"
          style={{
            borderColor: 'rgba(201,168,76,0.1)',
            background: 'rgba(10,10,10,0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <h1
            className="text-2xl md:text-3xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#f5f0e8',
            }}
          >
            {tabTitle}
          </h1>
          {tabDescription && (
            <p className="mt-2 text-sm" style={{ color: 'rgba(245,240,232,0.5)' }}>
              {tabDescription}
            </p>
          )}
        </header>

        <div
          ref={formAreaRef}
          className="flex-1 overflow-y-auto px-6 py-8"
          style={{ maxWidth: '800px' }}
        >
          {sections.map((section) => (
            <SectionForm
              key={section.id}
              sectionId={section.id}
              sectionTitle={section.title}
              fields={section.fields}
              answers={answers}
              onAnswerChange={onAnswerChange}
              onSave={() => handleSaveSection(section.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}