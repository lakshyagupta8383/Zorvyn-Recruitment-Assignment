const service = require("./auth.service");
const { registerSchema, loginSchema } = require("./auth.validation");

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await service.register(data);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await service.login(data);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await service.getMe(req.user.id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await service.logout(req.token, req.user.id);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me, logout };