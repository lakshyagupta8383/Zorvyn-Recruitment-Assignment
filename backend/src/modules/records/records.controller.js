const service = require("./records.service");
const {
  recordIdSchema,
  recordQuerySchema,
  searchQuerySchema,
  createRecordSchema,
  updateRecordSchema,
} = require("./records.validation");

const listRecords = async (req, res, next) => {
  try {
    const query = recordQuerySchema.parse(req.query);
    const result = await service.listRecords({ user: req.user, ...query });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

const searchRecords = async (req, res, next) => {
  try {
    const query = searchQuerySchema.parse(req.query);
    const result = await service.searchRecords({ user: req.user, ...query });
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

const getRecord = async (req, res, next) => {
  try {
    recordIdSchema.parse(req.params);
    const record = await service.getRecordById(req.params.id, req.user);

    if (!record) {
      return res.status(404).json({
        error: { message: "Record not found", code: 404 },
      });
    }

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
};

const createRecord = async (req, res, next) => {
  try {
    const data = createRecordSchema.parse(req.body);
    const record = await service.createRecord(data, req.user);
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    recordIdSchema.parse(req.params);
    const updates = updateRecordSchema.parse(req.body);
    const record = await service.updateRecord(req.params.id, updates, req.user);
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
};

const deleteRecord = async (req, res, next) => {
  try {
    recordIdSchema.parse(req.params);
    const result = await service.deleteRecord(req.params.id, req.user);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRecords,
  searchRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
};
