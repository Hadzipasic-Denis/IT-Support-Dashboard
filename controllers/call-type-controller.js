const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper.js");

const createCallType = asyncWrapper(async (req, res, next) => {
  const { name } = req.body;

  const callType = await pool.query(
    `INSERT INTO call_type (name) 
            VALUES ($1) RETURNING *`,
    [name],
  );

  res.status(201).json(callType.rows[0]);
});

module.exports = {
  createCallType,
};
