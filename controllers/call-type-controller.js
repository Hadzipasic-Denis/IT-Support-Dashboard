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

const updateCallType = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  const callType = await pool.query(
    `UPDATE call_type SET name = $1
             WHERE id = $2
             RETURNING *`,
    [name, id],
  );

  if (callType.rows.length <= 0) {
    throw new ErrorResponse("Call type not found", 404);
  }

  res.status(200).json(callType.rows[0]);
});

const deleteCallType = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const callType = await pool.query(
    `UPDATE call_type
     SET "isActive" = false
   WHERE id = $1`,
    [id],
  );

  if (callType.rowCount === 0) {
    throw new ErrorResponse("Call type not found", 404);
  }

  res.status(200).json({ message: "Call type deactivated" });
});

module.exports = {
  createCallType,
  updateCallType,
  deleteCallType,
};
