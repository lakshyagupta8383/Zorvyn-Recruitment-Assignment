const { z } = require("zod");

const categoryIdSchema = z.object({
  id: z.string().uuid(),
});

const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  is_system: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2),
  is_system: z.boolean().default(false),
  created_by: z.string().uuid().optional(),
});

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    is_system: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

module.exports = {
  categoryIdSchema,
  categoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
};
