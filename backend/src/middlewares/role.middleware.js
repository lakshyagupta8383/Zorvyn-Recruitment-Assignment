const requireRole = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

  return (req, res, next) => {
    const userRole = String(req.user?.role || "").toLowerCase();

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: { message: "Forbidden", code: 403 },
      });
    }

    next();
  };
};

module.exports = requireRole;
