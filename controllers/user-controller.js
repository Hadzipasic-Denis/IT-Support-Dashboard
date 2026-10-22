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

const updateUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const UPDATABLE_FIELDS = {
    name: "name",
    email: "email",
    locationId: '"locationId"',
    isActive: '"isActive"',
    role: "role",
  };

  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key]);
      setClauses.push(`${column} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new ErrorResponse("No valid fields to update", 400);
  }

  values.push(id);

  const sql = `UPDATE app_user SET ${setClauses.join(", ")}
             WHERE id = $${values.length}
             RETURNING id, name, email, role, "locationId", "isActive"`;

  const user = await pool.query(sql, values);

  if (user.rows.length === 0) {
    throw new ErrorResponse("User not found", 404);
  }

  res.json(user.rows[0]);
});

const deleteUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE app_user
     SET "isActive" = false
   WHERE id = $1`,
    [id],
  );

  if (result.rowCount === 0) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json({ message: "User deactivated" });
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
  deleteUser,
  updateUser,
};
