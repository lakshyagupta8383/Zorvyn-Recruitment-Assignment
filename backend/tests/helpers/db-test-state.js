const pool = require("../../src/db/pool");

const releaseDbSuite = async () => {
  const state = process.__DB_TEST_STATE__;

  if (!state || state.poolClosed) {
    return;
  }

  state.remainingSuites -= 1;

  if (state.remainingSuites <= 0) {
    state.poolClosed = true;
    await pool.end();
  }
};

module.exports = { releaseDbSuite };
