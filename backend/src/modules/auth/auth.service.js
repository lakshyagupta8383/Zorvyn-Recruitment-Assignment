const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ROLES } = require("../../constants/roles");
const { jwtSecret } = require("../../config/env");
const authRepository = require("../../repositories/auth.repository");
const userRepository = require("../../repositories/user.repository");

const register = async ({ name, email, password }) => {
  const hashed = await bcrypt.hash(password, 10);
  const roleId = await authRepository.findRoleIdByName(ROLES.VIEWER);

  if (!roleId) {
    throw { status: 500, message: "Default role is missing" };
  }

  const user = await userRepository.createUser({
    name,
    email,
    passwordHash: hashed,
    roleId,
    status: "active",
  });

  return { id: user.id, email: user.email };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserForLogin(email);

  if (!user) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    throw { status: 401, message: "Invalid credentials" };
  }

  if (user.status !== "active") {
    throw { status: 403, message: "User inactive" };
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    jwtSecret,
    { expiresIn: "1d" }
  );

  return { token };
};

const getMe = async (userId) => {
  const user = await authRepository.findUserProfileById(userId);

  if (!user) {
    return null;
  }

  return { id: user.id, email: user.email, role: user.role };
};

const logout = async (token, userId) => {
  return authRepository.insertSession(userId, token);
};

module.exports = { register, login, getMe, logout };
