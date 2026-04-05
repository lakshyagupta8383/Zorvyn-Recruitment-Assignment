const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Finance Data Processing Backend",
    version: "1.0.0",
    description: "OpenAPI documentation for the finance data processing and access control backend.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "Records" },
    { name: "Categories" },
    { name: "Dashboard" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              code: { type: "integer" },
            },
          },
        },
      },
      AuthRegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Test User" },
          email: { type: "string", format: "email", example: "test@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      AuthLoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "test@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      UserCreateRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Alex" },
          email: { type: "string", format: "email", example: "alex@example.com" },
          password: { type: "string", example: "password123" },
          role: { type: "string", enum: ["viewer", "analyst", "admin"], example: "viewer" },
          status: { type: "string", enum: ["active", "inactive"], example: "active" },
        },
      },
      UserUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Alex Updated" },
          email: { type: "string", format: "email", example: "alex.updated@example.com" },
          password: { type: "string", example: "newpassword123" },
          role: { type: "string", enum: ["viewer", "analyst", "admin"], example: "analyst" },
          status: { type: "string", enum: ["active", "inactive"], example: "inactive" },
        },
      },
      StatusUpdateRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["active", "inactive"], example: "inactive" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          status: { type: "string" },
        },
      },
      RecordCreateRequest: {
        type: "object",
        required: ["amount", "type", "category_id", "date"],
        properties: {
          amount: { type: "number", example: 250 },
          type: { type: "string", enum: ["income", "expense"], example: "income" },
          category_id: { type: "string", format: "uuid", example: "uuid" },
          date: { type: "string", format: "date", example: "2024-02-01" },
          notes: { type: "string", example: "Monthly salary" },
        },
      },
      RecordUpdateRequest: {
        type: "object",
        properties: {
          amount: { type: "number", example: 300 },
          type: { type: "string", enum: ["income", "expense"], example: "expense" },
          category_id: { type: "string", format: "uuid", example: "uuid" },
          date: { type: "string", format: "date", example: "2024-02-02" },
          notes: { type: "string", example: "Updated note" },
        },
      },
      Record: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          amount: { type: "string", example: "250.00" },
          type: { type: "string" },
          category_id: { type: "string", format: "uuid" },
          category_name: { type: "string" },
          date: { type: "string", format: "date" },
          notes: { type: "string" },
          created_by: { type: "string", format: "uuid" },
          created_by_email: { type: "string" },
        },
      },
      CategoryCreateRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Projects" },
          is_system: { type: "boolean", example: false },
        },
      },
      CategoryUpdateRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Projects Updated" },
          is_system: { type: "boolean", example: false },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          is_system: { type: "boolean" },
          created_by: { type: "string", format: "uuid" },
          created_by_email: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthRegisterRequest" } },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: { data: { id: "uuid", email: "test@example.com" } },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive a JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthLoginRequest" } },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": { example: { data: { token: "<jwt>" } } },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Invalidate the current JWT",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": { example: { message: "Logged out" } },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", email: "test@example.com", role: "viewer" } },
              },
            },
          },
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: [{ id: "uuid", name: "Alex", email: "alex@example.com", role: "Analyst", status: "active" }],
                  pagination: { page: 1, limit: 10, total: 1, pages: 1 },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create a user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UserCreateRequest" } },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Alex", email: "alex@example.com", role: "Viewer", status: "active" } },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get a user by id",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Alex", email: "alex@example.com", role: "Analyst", status: "active" } },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update a user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UserUpdateRequest" } },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Alex", email: "alex@example.com", role: "Analyst", status: "inactive" } },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { example: { data: { deleted: true } } } },
          },
        },
      },
    },
    "/users/{id}/status": {
      patch: {
        tags: ["Users"],
        summary: "Update user status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/StatusUpdateRequest" } },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", status: "inactive" } },
              },
            },
          },
        },
      },
    },
    "/records": {
      get: {
        tags: ["Records"],
        summary: "List records",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: [{ id: "uuid", amount: "1200.00", type: "expense", category_name: "Expenses" }],
                  pagination: { page: 1, limit: 10, total: 1, pages: 1 },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Records"],
        summary: "Create a record",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RecordCreateRequest" } },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: { data: { id: "uuid", amount: "250.00", type: "income", category_name: "Salary" } },
              },
            },
          },
        },
      },
    },
    "/records/search": {
      get: {
        tags: ["Records"],
        summary: "Search records",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: [{ id: "uuid", notes: "Office rent" }],
                  pagination: { page: 1, limit: 10, total: 1, pages: 1 },
                },
              },
            },
          },
        },
      },
    },
    "/records/{id}": {
      get: {
        tags: ["Records"],
        summary: "Get a record",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", amount: "1200.00", type: "expense", category_name: "Expenses" } },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Records"],
        summary: "Update a record",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RecordUpdateRequest" } },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", notes: "Updated note" } },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Records"],
        summary: "Soft delete a record",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { example: { data: { deleted: true } } } },
          },
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: [{ id: "uuid", name: "Salary", is_system: true }],
                  pagination: { page: 1, limit: 10, total: 1, pages: 1 },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create a category",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CategoryCreateRequest" } },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Projects", is_system: false } },
              },
            },
          },
        },
      },
    },
    "/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get a category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Salary", is_system: true } },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Categories"],
        summary: "Update a category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CategoryUpdateRequest" } },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: { data: { id: "uuid", name: "Projects Updated", is_system: false } },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Delete a category",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "OK",
            content: { "application/json": { example: { data: { deleted: true } } } },
          },
        },
      },
    },
    "/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Get summary totals",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: {
                    total_income: "5000.00",
                    total_expenses: "1200.00",
                    net_balance: "3800.00",
                    total_records: 2,
                    categories_used: 2,
                  },
                },
              },
            },
          },
        },
      },
    },
    "/dashboard/analytics": {
      get: {
        tags: ["Dashboard"],
        summary: "Get analytics breakdown",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                example: {
                  data: {
                    category_breakdown: [],
                    monthly_trends: [],
                    weekly_trends: [],
                    recent_activity: [],
                    top_spending_categories: [],
                    range: { from: "2024-01-01", to: "2024-01-31" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerUiHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Finance API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b1020; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
        });
      };
    </script>
  </body>
</html>`;

module.exports = {
  openApiDocument,
  swaggerUiHtml,
};
