jest.mock("../../src/db/pool", () => ({
  connect: jest.fn(),
}));

const pool = require("../../src/db/pool");
const withTransaction = require("../../src/db/transaction");

describe("withTransaction", () => {
  test("commits on success", async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };

    pool.connect.mockResolvedValue(client);

    const result = await withTransaction(async (tx) => {
      expect(tx).toBe(client);
      await tx.query("SELECT 1");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "SELECT 1");
    expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("rolls back on failure", async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };

    pool.connect.mockResolvedValue(client);

    await expect(
      withTransaction(async (tx) => {
        await tx.query("INSERT INTO demo VALUES (1)");
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "INSERT INTO demo VALUES (1)");
    expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
