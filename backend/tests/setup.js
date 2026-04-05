require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
  quiet: true,
});

const fs = require("fs");
const path = require("path");

const countTestFiles = (dir) => {
  let count = 0;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "db") {
        continue;
      }

      count += countTestFiles(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      count += 1;
    }
  }

  return count;
};

if (!process.__DB_TEST_STATE__) {
  process.__DB_TEST_STATE__ = {
    remainingSuites: countTestFiles(__dirname),
    poolClosed: false,
  };
}
