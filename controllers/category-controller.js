const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper");
const ErrorResponse = require("../utils/ErrorResponse.js");

const MAX_SLA_HOURS = 720

const createCategory = asyncWrapper(async (req, res, next) => {
  const { name, slaHours, defaultAssigneeId = null } = req.body;

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
    [name, slaHours, defaultAssigneeId],
  );

  res.status(201).json(category.rows);
});

const deleteCategory = asyncWrapper(async(req, res, next)=> {
  const {id} = req.params

  const category = await pool.query(`
      UPDATE category SET "isActive" = false WHERE id = $1
      `, [id]
  )

  if(category.rowCount === 0) {
    throw new ErrorResponse("Category not found", 404)
  }

  res.status(200).json({message: "Category deactivated"})
})

module.exports = {
  createCategory,
  deleteCategory
};
