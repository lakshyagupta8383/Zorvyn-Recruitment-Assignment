const { z } = require("zod");

const errorHandler = require("../../src/middlewares/error.middleware");

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("error middleware", () => {
  test("returns 400 for Zod validation errors", () => {
    let err;

    try {
      z.object({ name: z.string().min(2) }).parse({ name: "" });
    } catch (caught) {
      err = caught;
    }

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: expect.stringContaining("Too small"),
        code: 400,
      },
    });
  });
});
