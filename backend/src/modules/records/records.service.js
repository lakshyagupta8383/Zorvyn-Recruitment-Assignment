const recordRepository = require("../../repositories/record.repository");
const { ROLES } = require("../../constants/roles");

const manageAllRoles = new Set([ROLES.ADMIN]);

const normalizeRole = (role) => String(role || "").toLowerCase();
const canManageAll = (user) => manageAllRoles.has(normalizeRole(user.role));

const ensureCanMutate = (user) => {
  if (!canManageAll(user)) {
    throw { status: 403, message: "Forbidden" };
  }
};

const listRecords = async (query) => {
  return recordRepository.listRecords(query);
};

const searchRecords = async (query) => {
  return recordRepository.searchRecords(query);
};

const getRecordById = async (id, user) => {
  return recordRepository.getRecordById(id, user);
};

const createRecord = async (data, user) => {
  ensureCanMutate(user);
  return recordRepository.createRecord(data, user);
};

const updateRecord = async (id, updates, user) => {
  ensureCanMutate(user);
  return recordRepository.updateRecord(id, updates, user);
};

const deleteRecord = async (id, user) => {
  ensureCanMutate(user);
  return recordRepository.deleteRecord(id, user);
};

module.exports = {
  listRecords,
  searchRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
