const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper");
const ErrorResponse = require("../utils/ErrorResponse.js");

const MAX_SLA_HOURS = 120;

const UPDATABLE_FIELDS = {
  name: "name",
  slaHours: '"slaHours"',
  defaultAssigneeId: '"defaultAssigneeId"',
  isActive: '"isActive"',
};

const createCategory = asyncWrapper(async (req, res, next) => {
  const { name, slaHours = 120, defaultAssigneeId = null } = req.body;

  let cleanName;

  if (name !== undefined) {
    cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName)
      throw new ErrorResponse("Name must be a non-empty string", 400);
  }

  if (!Number.isInteger(slaHours) || slaHours < 1 || slaHours > MAX_SLA_HOURS) {
    throw new ErrorResponse(
      `SLA hours must be a whole number between 1 and ${MAX_SLA_HOURS}`,
      400,
    );
  }

  if (defaultAssigneeId !== null) {
    if (!Number.isInteger(defaultAssigneeId)) {
      throw new ErrorResponse("defaultAssigneeId must be a user id", 400);
    }

    const assignee = await pool.query(
      `SELECT id FROM app_user
       WHERE id = $1 AND "isActive" = true AND role IN ('AGENT', 'ADMIN')`,
      [defaultAssigneeId],
    );

    if (assignee.rows.length === 0) {
      throw new ErrorResponse(
        "Default assignee must be an active agent or admin",
        400,
      );
    }
  }

  const category = await pool.query(
    `INSERT INTO category (name, "slaHours", "defaultAssigneeId") VALUES ($1, $2, $3) RETURNING * `,
    [cleanName, slaHours, defaultAssigneeId],
  );

  res.status(201).json(category.rows[0]);
});

const updateCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, slaHours, defaultAssigneeId, isActive } = req.body;

  let cleanName;

  if (name !== undefined) {
    cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName)
      throw new ErrorResponse("Name must be a non-empty string", 400);
  }

  if (
    slaHours !== undefined &&
    (!Number.isInteger(slaHours) || slaHours < 1 || slaHours > MAX_SLA_HOURS)
  ) {
    throw new ErrorResponse(
      `SLA hours must be a whole number between 1 and ${MAX_SLA_HOURS}`,
      400,
    );
  }

  if (defaultAssigneeId !== undefined && defaultAssigneeId !== null) {
    const assignee = await pool.query(
      `
      SELECT id from app_user WHERE id = $1 AND "isActive" = true AND role IN('AGENT', 'ADMIN')
      `,
      [defaultAssigneeId],
    );

    if (assignee.rows.length === 0) {
      throw new ErrorResponse(
        "Default assignee must be an active agent or admin",
        400,
      );
    }
  }

  const updates = { name: cleanName, slaHours, defaultAssigneeId, isActive };

  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
    if (updates[key] !== undefined) {
      values.push(updates[key]);
      setClauses.push(`${column} = $${values.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new ErrorResponse("No valid fields to update", 400);
  }

  values.push(id);

  const sql = `UPDATE category SET ${setClauses.join(", ")}
             WHERE id = $${values.length}
             RETURNING *`;

  const category = await pool.query(sql, values);

  if (category.rowCount === 0) {
    throw new ErrorResponse("Category not found", 404);
  }

  res.status(200).json(category.rows[0]);
});

const deleteCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const category = await pool.query(
    `
      UPDATE category SET "isActive" = false WHERE id = $1
      `,
    [id],
  );

  if (category.rowCount === 0) {
    throw new ErrorResponse("Category not found", 404);
  }

  res.status(200).json({ message: "Category deactivated" });
});

const getCategory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const category = await pool.query(
    `
      SELECT * FROM category WHERE id = $1
    `,
    [id],
  );

  if (category.rowCount === 0) {
    throw new ErrorResponse("Category not found", 404);
  }

  res.status(200).json(category.rows[0]);
});

const getAllCategories = asyncWrapper(async (req, res, next) => {
  const categories = await pool.query(
    `
      SELECT * FROM category
    `,
  );

  res.status(200).json(categories.rows);
});

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  getAllCategories,
};
