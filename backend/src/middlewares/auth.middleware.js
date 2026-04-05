const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const authRepository = require("../repositories/auth.repository");

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
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({
        error: { message: "Invalid token", code: 401 }
      });
    }

    // check if token is invalidated (logout)
    const sessionCheck = await authRepository.findSessionByToken(token);

    if (sessionCheck && !sessionCheck.is_valid) {
      return res.status(401).json({
        error: { message: "Token invalidated", code: 401 }
      });
    }

    // fetch user from DB (never trust JWT blindly)
    const user = await authRepository.findUserProfileById(decoded.id);

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
