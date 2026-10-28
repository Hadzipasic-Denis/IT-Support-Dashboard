const pool = require("../db.js");
const { SYSTEM_USER_EMAIL } = require("../utils/constants.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const createTicket = async (data, authorId) => {
  const {
    subject,
    description,
    categoryId,
    callTypeId,
    contactEmail,
    priority,
  } = data;

  const cleanSubject = typeof subject === "string" ? subject.trim() : "";
  if (!cleanSubject) {
    throw new ErrorResponse("Subject must be a non-empty string", 400);
  }

  const cleanDescription =
    typeof description === "string" ? description.trim() : "";
  if (!cleanDescription) {
    throw new ErrorResponse("Description must be a non-empty string", 400);
  }

  if (!Number.isInteger(categoryId)) {
    throw new ErrorResponse("Invalid id of categoryId", 400);
  }

  const category = await pool.query(
    `SELECT c.id, u.id AS "assigneeId"
      FROM category c
      LEFT JOIN app_user u
      ON u.id = c."defaultAssigneeId"
      AND u."isActive" = true
      AND u.role IN ('AGENT', 'ADMIN')
      WHERE c.id = $1
      AND c."isActive" = true`,
    [categoryId],
  );

  if (category.rows.length === 0) {
    throw new ErrorResponse("Category not found or inactive", 400);
  }

  const assigneeId = category.rows[0].assigneeId;

  if (!Number.isInteger(callTypeId)) {
    throw new ErrorResponse("Invalid id of callTypeId", 400);
  }

  const callType = await pool.query(
    `SELECT id FROM call_type WHERE id = $1 AND "isActive" = true`,
    [callTypeId],
  );

  if (callType.rows.length === 0) {
    throw new ErrorResponse("Call type not found or inactive", 400);
  }

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

  const systemUser = await pool.query(
    `SELECT id FROM app_user WHERE email = $1`,
    [SYSTEM_USER_EMAIL],
  );

  if (systemUser.rows.length === 0) {
    throw new Error("System user missing, run npm run seed");
  }

  const systemUserId = systemUser.rows[0].id;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      `INSERT INTO ticket (subject, description, "categoryId", "callTypeId", "contactEmail", "createdById", "requesterId", priority, source, "updatedAt") 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DASHBOARD', NOW()) 
        RETURNING id, "ticketNumber", subject, description, status, priority, "categoryId", "callTypeId", "contactEmail", "requesterId", "createdById", source, "submittedAt"`,
      [
        cleanSubject,
        cleanDescription,
        categoryId,
        callTypeId,
        cleanEmail,
        authorId,
        requesterId,
        priority,
      ],
    );

    const ticket = ticketResult.rows[0];

    const ticketChangeResult = await client.query(
      `INSERT INTO ticket_change ("ticketId", "changedById")
        VALUES ($1, $2)
        RETURNING id`,
      [ticket.id, authorId],
    );

    const ticketChange = ticketChangeResult.rows[0];

    await client.query(
      `INSERT INTO ticket_change_item ("changeId", field, "oldValue", "newValue")
        VALUES ($1, 'status', NULL, $2)`,
      [ticketChange.id, ticket.status],
    );

    if (assigneeId) {
      await client.query(
        `INSERT INTO ticket_assignee ("ticketId", "userId") VALUES ($1, $2)`,
        [ticket.id, assigneeId],
      );

      const routingChangeResult = await client.query(
        `INSERT INTO ticket_change ("ticketId", "changedById", comment)
          VALUES ($1, $2, 'Assigned by category routing')
          RETURNING id`,
        [ticket.id, systemUserId],
      );

      const routingChange = routingChangeResult.rows[0];

      await client.query(
        `INSERT INTO ticket_change_item ("changeId", field, "oldValue", "newValue")
          VALUES ($1, 'assignee', NULL, $2)`,
        [routingChange.id, String(assigneeId)],
      );
    }

    await client.query("COMMIT");
    return ticket;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { createTicket };
