import { z } from 'zod';

/**
 * Validation schemas for API endpoints using Zod
 * These schemas ensure type safety and input validation at runtime
 */

// Client Notes Schema
export const ClientNotesSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  notes: z.string().max(5000, 'Notes must be less than 5000 characters').optional().nullable()
});

export type ClientNotesInput = z.infer<typeof ClientNotesSchema>;

// Lead Capture Schema
export const LeadSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional()
});

export type LeadInput = z.infer<typeof LeadSchema>;

// Report Data Schema
export const ReportDataSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  trainerId: z.string().uuid('Invalid trainer ID format'),
  reportData: z.record(z.unknown()), // JSONB data
  dateRangeStart: z.string().datetime('Invalid start date format'),
  dateRangeEnd: z.string().datetime('Invalid end date format')
});

export type ReportDataInput = z.infer<typeof ReportDataSchema>;

// File Upload Schema
export const ImageUploadSchema = z.object({
  image: z.string().regex(
    /^data:image\/(png|jpg|jpeg|webp);base64,/,
    'Invalid image format - must be PNG, JPG, JPEG, or WebP'
  ),
  filename: z.string().max(255).optional()
});

export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;

// Trainerize Credentials Schema
export const TrainerizeCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  trainerizeId: z.string().optional()
});

export type TrainerizeCredentialsInput = z.infer<typeof TrainerizeCredentialsSchema>;

// Report Link Generation Schema
export const GenerateLinkSchema = z.object({
  reportId: z.string().uuid('Invalid report ID format')
});

export type GenerateLinkInput = z.infer<typeof GenerateLinkSchema>;

// Client Delete Schema
export const ClientDeleteSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format')
});

export type ClientDeleteInput = z.infer<typeof ClientDeleteSchema>;

// Report Delete Schema
export const ReportDeleteSchema = z.object({
  reportId: z.string().uuid('Invalid report ID format')
});

export type ReportDeleteInput = z.infer<typeof ReportDeleteSchema>;

/**
 * Utility function to validate request body against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with parsed data or error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}
