/**
 * Zod validation schemas for Notes and File Upload forms
 */

import { z } from 'zod'

export const fileMetadataSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename cannot exceed 255 characters')
    .refine(
      (val) => !/[<>:"/\\|?*]/.test(val),
      'Filename contains invalid characters'
    ),
  file_type: z.enum(['pdf', 'txt', 'md', 'docx'], {
    message: 'File type must be pdf, txt, md, or docx'
  }),
  file_size: z
    .number()
    .int('File size must be an integer')
    .min(1, 'File size must be at least 1 byte')
    .max(10485760, 'File size cannot exceed 10MB (10,485,760 bytes)'),
  content_type: z.string().optional(),
})

export type FileMetadataInput = z.infer<typeof fileMetadataSchema>

export const noteUploadSchema = z.object({
  subject_id: z.string().uuid('Invalid subject ID format').optional(),
  topic_id: z.string().uuid('Invalid topic ID format').optional(),
  title: z
    .string()
    .max(255, 'Title cannot exceed 255 characters')
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : undefined)),
})

export type NoteUploadInput = z.infer<typeof noteUploadSchema>

export const noteUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title cannot exceed 255 characters')
    .optional(),
  content: z.string().min(1, 'Content cannot be empty').optional(),
})

export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>

