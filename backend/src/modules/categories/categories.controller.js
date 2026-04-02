const service = require("./categories.service");
const {
  categoryIdSchema,
  categoryListQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} = require("./categories.validation");

const listCategories = async (req, res, next) => {
  try {
    const query = categoryListQuerySchema.parse(req.query);
    const result = await service.listCategories(query);
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

const getCategory = async (req, res, next) => {
  try {
    categoryIdSchema.parse(req.params);
    const category = await service.getCategoryById(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: { message: "Category not found", code: 404 },
      });
    }

    res.json({ data: category });
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = createCategorySchema.parse({ ...req.body, created_by: req.user.id });
    const category = await service.createCategory(data);
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    categoryIdSchema.parse(req.params);
    const updates = updateCategorySchema.parse(req.body);
    const category = await service.updateCategory(req.params.id, updates);
    res.json({ data: category });
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    categoryIdSchema.parse(req.params);
    const result = await service.deleteCategory(req.params.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
