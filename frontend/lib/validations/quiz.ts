/**
 * Zod validation schemas for Quiz forms
 */

import { z } from 'zod'

export const quizGenerateSchema = z.object({
  topic_id: z.string().uuid('Invalid topic ID format'),
  count: z
    .number()
    .int('Count must be an integer')
    .min(1, 'At least 1 question required')
    .max(20, 'Maximum 20 questions allowed')
    .default(5),
  difficulty_level: z
    .number()
    .int('Difficulty must be an integer')
    .min(1, 'Minimum difficulty is 1')
    .max(5, 'Maximum difficulty is 5')
    .optional(),
  question_type: z.enum(['mcq', 'short_answer', 'true_false']).default('mcq'),
})

export type QuizGenerateInput = z.infer<typeof quizGenerateSchema>

export const quizResultSchema = z.object({
  quiz_id: z.string().uuid('Invalid quiz ID format'),
  topic_id: z.string().uuid('Invalid topic ID format'),
  // Trim whitespace to match backend Pydantic validator behavior
  user_answer: z.string().min(1, 'Answer cannot be empty').trim(),
  is_correct: z.boolean(),
  time_taken_seconds: z
    .number()
    .int('Time must be an integer')
    .min(0, 'Time cannot be negative')
    .max(3600, 'Time cannot exceed 1 hour')
    .default(0),
})

export type QuizResultInput = z.infer<typeof quizResultSchema>

