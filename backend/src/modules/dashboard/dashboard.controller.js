const service = require("./dashboard.service");
const { dashboardRangeSchema } = require("./dashboard.validation");

const summary = async (req, res, next) => {
  try {
    const query = dashboardRangeSchema.parse(req.query);
    const data = await service.getSummary(req.user, query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

const analytics = async (req, res, next) => {
  try {
    const query = dashboardRangeSchema.parse(req.query);
    const data = await service.getAdvancedAnalytics(req.user, query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  summary,
  analytics,
};
