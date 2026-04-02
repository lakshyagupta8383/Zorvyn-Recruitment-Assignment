const service = require("./users.service");
const {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  statusUpdateSchema,
  userIdSchema,
} = require("./users.validation");

const listUsers = async (req, res, next) => {
  try {
    const query = userListQuerySchema.parse(req.query);
    const result = await service.listUsers(query);
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    userIdSchema.parse(req.params);
    const user = await service.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", code: 404 },
      });
    }

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await service.createUser(data);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    userIdSchema.parse(req.params);
    const updates = updateUserSchema.parse(req.body);
    const user = await service.updateUser(req.params.id, updates);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    userIdSchema.parse(req.params);
    const { status } = statusUpdateSchema.parse(req.body);
    const user = await service.setUserStatus(req.params.id, status);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    userIdSchema.parse(req.params);
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        error: { message: "You cannot delete your own account", code: 400 },
      });
    }

    const result = await service.deleteUser(req.params.id);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateStatus,
  deleteUser,
};
