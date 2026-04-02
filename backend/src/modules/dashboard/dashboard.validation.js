const { z } = require("zod");

const dashboardRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  {
    message: "from must be on or before to",
    path: ["to"],
  }
);

module.exports = { dashboardRangeSchema };
