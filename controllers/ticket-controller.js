const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const createTicket = asyncWrapper(async (req, res, next) => {
  const { subject, description, categoryId, callTypeId } = req.body;

  const isStaff = ["AGENT", "ADMIN"].includes(req.user.role);

  const contactEmail =
    isStaff && req.body.contactEmail ? req.body.contactEmail : req.user.email;

  const priority = isStaff && req.body.priority ? req.body.priority : "MEDIUM";

  if (!PRIORITIES.includes(priority)) {
    throw new ErrorResponse(
      `Priority must be one of ${PRIORITIES.join(", ")}`,
      400,
    );
  }

  const cleanEmail = contactEmail.trim().toLowerCase();

  const requester = await pool.query(
    `SELECT id FROM app_user WHERE email = $1 AND "isActive" = true`,
    [cleanEmail],
  );

  const requesterId = requester.rows[0]?.id ?? null;

  const ticket = await pool.query(
    `INSERT INTO ticket (subject, description, "categoryId", "callTypeId", "contactEmail", "createdById", "requesterId", priority, source, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DASHBOARD', NOW()) RETURNING *`,
    [
      subject,
      description,
      categoryId,
      callTypeId,
      cleanEmail,
      req.user.id,
      requesterId,
      priority,
    ],
  );

  res.status(201).json(ticket.rows[0]);
});

module.exports = {
  createTicket,
};
