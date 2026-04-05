const { ZodError } = require("zod");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: err.issues.map((issue) => issue.message).join("; "),
        code: 400,
      },
    });
  }

  const status = err.status || 500;

  res.status(status).json({
    error: {
      message: err.message || "Internal Server Error",
      code: status
    }
  });
};

module.exports = errorHandler;
