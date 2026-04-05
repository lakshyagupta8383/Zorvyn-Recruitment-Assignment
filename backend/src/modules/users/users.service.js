const bcrypt = require("bcrypt");
const userRepository = require("../../repositories/user.repository");
const authRepository = require("../../repositories/auth.repository");

const listUsers = async (query) => {
  return userRepository.listUsers(query);
};

const getUserById = async (id) => {
  return userRepository.getUserById(id);
};

const createUser = async ({ name, email, password, role, status }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const roleId = await authRepository.findRoleIdByName(role);

  if (!roleId) {
    throw { status: 400, message: "Invalid role" };
  }

  return userRepository.createUser({
    name,
    email,
    passwordHash: hashedPassword,
    roleId,
    status,
  });
};

const updateUser = async (id, updates) => {
  const nextUpdates = { ...updates };

  if (nextUpdates.role !== undefined) {
    const roleId = await authRepository.findRoleIdByName(nextUpdates.role);

    if (!roleId) {
      throw { status: 400, message: "Invalid role" };
    }

    nextUpdates.roleId = roleId;
    delete nextUpdates.role;
  }

  if (nextUpdates.password !== undefined) {
    nextUpdates.passwordHash = await bcrypt.hash(nextUpdates.password, 10);
    delete nextUpdates.password;
  }

  return userRepository.updateUser(id, nextUpdates);
};

const setUserStatus = async (id, status) => {
  return userRepository.updateUser(id, { status });
};

const deleteUser = async (id) => {
  return userRepository.deleteUser(id);
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
};
