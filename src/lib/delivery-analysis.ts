// Pure text-analysis for interview delivery quality.
// No LLM calls, no API cost. Runs server-side in the evaluate route and
// client-side in the simulator debrief view.

import type { DeliveryNote } from '@/types/simulator';

const FILLER_SOURCE = /\b(um+|uh+|like|you know|kinda|kind of|sort of)\b/gi;
const HEDGE_SOURCE = /\b(i think|maybe|probably|i believe|i guess|might be|not sure|i'm not sure|i suppose|i mean)\b/gi;

export function analyzeDelivery(answerText: string): DeliveryNote[] {
  const notes: DeliveryNote[] = [];
  const trimmed = answerText.trim();
  if (!trimmed) return notes;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const fillerMatches = [...trimmed.matchAll(new RegExp(FILLER_SOURCE.source, 'gi'))];
  const hedgeMatches = [...trimmed.matchAll(new RegExp(HEDGE_SOURCE.source, 'gi'))];

  if (wordCount < 30) {
    notes.push({
      type: 'brevity',
      detail: `${wordCount} words — officers expect 50–100 words for substantive answers. Expand with specific facts about your investment or role.`,
    });
  }

  if (fillerMatches.length >= 2) {
    const examples = [...new Set(fillerMatches.map(m => m[0].toLowerCase()))].slice(0, 3).join('", "');
    notes.push({
      type: 'fillers',
      detail: `${fillerMatches.length} filler words detected ("${examples}"). These signal uncertainty to the officer. Pause instead of filling silence.`,
    });
  }

  if (hedgeMatches.length >= 2) {
    const examples = [...new Set(hedgeMatches.map(m => m[0].toLowerCase()))].slice(0, 2).join('", "');
    notes.push({
      type: 'hedging',
      detail: `Hedging language detected ("${examples}"). State investment facts directly — "I invested $180,000" not "I think it was around $180,000."`,
    });
  }

  if (wordCount >= 40 && hedgeMatches.length / wordCount > 0.08) {
    const ratio = Math.round((hedgeMatches.length / wordCount) * 100);
    notes.push({
      type: 'high_hedge_ratio',
      detail: `${ratio}% of words are hedges or qualifiers. Officers interpret this as low confidence. Practise stating facts without softening language.`,
    });
  }

  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 35);
  if (longSentences.length > 0) {
    notes.push({
      type: 'complex_sentences',
      detail: `${longSentences.length} sentence${longSentences.length > 1 ? 's are' : ' is'} over 35 words. Long sentences are harder to deliver clearly. Break them into two shorter statements.`,
    });
  }

  if (sentences.length >= 5) {
    const avgSentenceLength = wordCount / sentences.length;
    if (avgSentenceLength < 6) {
      notes.push({
        type: 'choppy',
        detail: `Average sentence length is ${Math.round(avgSentenceLength)} words — very short sentences can sound rehearsed. Connect related ideas into fuller sentences.`,
      });
    }
  }

  return notes;
}
