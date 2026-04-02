const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: { message: "Unauthorized", code: 401 }
      });
    }

    const token = header.split(" ")[1];

    // verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        error: { message: "Invalid token", code: 401 }
      });
    }

    // check if token is invalidated (logout)
    const sessionCheck = await pool.query(
      "SELECT is_valid FROM sessions WHERE token = $1",
      [token]
    );

    if (sessionCheck.rows.length && !sessionCheck.rows[0].is_valid) {
      return res.status(401).json({
        error: { message: "Token invalidated", code: 401 }
      });
    }

    // fetch user from DB (never trust JWT blindly)
    const result = await pool.query(
      `SELECT u.id, u.status, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: { message: "User not found", code: 401 }
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        error: { message: "User inactive", code: 403 }
      });
    }

    // attach to request
    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: { message: "Internal server error", code: 500 }
    });
  }
};

module.exports = authMiddleware;