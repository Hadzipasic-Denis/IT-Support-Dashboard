const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const getUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const user = await pool.query(
    `SELECT id, name, email, role, "locationId", "isActive" FROM app_user WHERE id = $1`,
    [id],
  );

  if (user.rows.length <= 0) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json(user.rows[0]);
});

const getAllUsers = asyncWrapper(async (req, res, next) => {
  const user = await pool.query(
    `SELECT id, name, email, role, "locationId", "isActive" FROM app_user`,
  );

  res.status(200).json(user.rows);
});

module.exports = {
  getUser,
  getAllUsers,
};
