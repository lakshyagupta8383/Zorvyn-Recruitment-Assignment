const dashboardRepository = require("../../repositories/dashboard.repository");

const getSummary = async (user, query) => {
  return dashboardRepository.getSummary(user, query);
};

const getAdvancedAnalytics = async (user, query) => {
  return dashboardRepository.getAdvancedAnalytics(user, query);
};

module.exports = {
  getSummary,
  getAdvancedAnalytics,
};
