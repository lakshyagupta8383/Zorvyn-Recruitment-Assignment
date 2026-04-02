const pool = require("./pool");

const withTransaction = async (fn) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Transaction rollback failed:", rollbackErr.message);
    }

    throw err;
  } finally {
    client.release();
  }
};

module.exports = withTransaction;
