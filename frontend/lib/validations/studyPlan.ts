/**
 * Zod validation schemas for Study Plan forms
 */

import { z } from 'zod'

export const studyPlanGenerateSchema = z.object({
  subject_id: z.string().uuid('Invalid subject ID format'),
  plan_type: z.enum(['daily', 'weekly']).default('daily'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  available_hours_per_day: z
    .number()
    .min(0.5, 'Minimum 0.5 hours per day')
    .max(24, 'Maximum 24 hours per day')
    .default(3.0),
}).refine(
  (data) => {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    return end > start
  },
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
)

export type StudyPlanGenerateInput = z.infer<typeof studyPlanGenerateSchema>

export const studyPlanUpdateSchema = z.object({
  plan_data: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
})

export type StudyPlanUpdateInput = z.infer<typeof studyPlanUpdateSchema>

