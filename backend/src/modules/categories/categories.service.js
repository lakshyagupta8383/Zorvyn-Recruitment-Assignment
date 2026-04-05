const categoryRepository = require("../../repositories/category.repository");

const listCategories = async (query) => {
  return categoryRepository.listCategories(query);
};

const getCategoryById = async (id) => {
  return categoryRepository.getCategoryById(id);
};

const createCategory = async ({ name, is_system, created_by }) => {
  return categoryRepository.createCategory({ name, is_system, created_by });
};

const updateCategory = async (id, updates) => {
  return categoryRepository.updateCategory(id, updates);
};

const deleteCategory = async (id) => {
  return categoryRepository.deleteCategory(id);
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
