const { z } = require("zod");
const { ROLE_VALUES } = require("../../constants/roles");

const userRoleSchema = z.enum(ROLE_VALUES);
const userStatusSchema = z.enum(["active", "inactive"]);

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  role: userRoleSchema.default("viewer"),
  status: userStatusSchema.default("active"),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(6).optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
  );

const userIdSchema = z.object({
  id: z.string().uuid(),
});

const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

const statusUpdateSchema = z.object({
  status: userStatusSchema,
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  statusUpdateSchema,
  userIdSchema,
};
