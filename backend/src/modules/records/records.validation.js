const { z } = require("zod");

const recordTypeSchema = z.enum(["income", "expense"]);

const recordIdSchema = z.object({
  id: z.string().uuid(),
});

const recordQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: recordTypeSchema.optional(),
  category_id: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const createRecordSchema = z.object({
  amount: z.coerce.number().positive(),
  type: recordTypeSchema,
  category_id: z.string().uuid(),
  date: z.coerce.date(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

const updateRecordSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    type: recordTypeSchema.optional(),
    category_id: z.string().uuid().optional(),
    date: z.coerce.date().optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

module.exports = {
  recordIdSchema,
  recordQuerySchema,
  searchQuerySchema,
  createRecordSchema,
  updateRecordSchema,
};
