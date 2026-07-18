// Shared zod schemas for API route request validation (Sprint M-6).
// Validate at the boundary only — fields not read by any route handler are
// left unvalidated via .passthrough() rather than fully modeling every type.
import { z } from 'zod';

// SimulatorContext (src/types/simulator.ts) is large and mostly passed through
// unread by individual routes. Validate only the fields route handlers touch;
// passthrough() keeps this schema resilient to that type growing over time.
export const simulatorContextSchema = z
  .object({
    applicationId: z.string().min(1),
    businessName: z.string(),
    operatingName: z.string().nullable().optional(),
    businessCategory: z.string(),
    targetState: z.string().nullable().optional(),
    operationalStatus: z.enum(['operational', 'pre_start', 'not_yet_formed']),
    investmentAmount: z.number(),
    revenueYear1: z.number(),
    employeeCountCurrent: z.number(),
    employeeCountYear1: z.number(),
    priorVisaDenial: z.boolean(),
    caseTheoryNarrative: z.string().nullable().optional(),
  })
  .passthrough();

export const priorAnswerSchema = z.object({
  questionText: z.string(),
  answerText: z.string(),
});

export const evaluateRequestSchema = z.object({
  questionId: z.string().min(1),
  questionText: z.string().min(1),
  answer: z.string().min(1),
  context: simulatorContextSchema,
  priorAnswers: z.array(priorAnswerSchema).optional(),
});

export type EvaluateRequestBody = z.infer<typeof evaluateRequestSchema>;
