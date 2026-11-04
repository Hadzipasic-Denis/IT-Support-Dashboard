const pool = require("../db.js");
const { SYSTEM_USER_EMAIL } = require("../utils/constants.js");
const { computeSla } = require("./sla-service.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const STATUSES = ["NEW", "IN_PROGRESS", "WAITING_FOR_FEEDBACK", "DONE"];

const UPDATABLE_FIELDS = {
  status: "status",
  priority: "priority",
  categoryId: '"categoryId"',
  callTypeId: '"callTypeId"',
};

const TICKET_COLUMNS = `id, "ticketNumber", subject, description, status, priority,
  "categoryId", "callTypeId", "contactEmail", "requesterId", "createdById", source,
  "submittedAt", "slaWorkedSeconds", "slaClockStartedAt", "slaBreachAt",
  "slaBreachedAt", "resolvedAt"`;

const validateCallType = async (callTypeIdValue) => {
  if (!Number.isInteger(callTypeIdValue)) {
    throw new ErrorResponse("Invalid id of callTypeId", 400);
  }

  const callType = await pool.query(
    `SELECT id FROM call_type WHERE id = $1 AND "isActive" = true`,
    [callTypeIdValue],
  );

  if (callType.rows.length === 0) {
    throw new ErrorResponse("Call type not found or inactive", 400);
  }
};

const validateCategory = async (categoryIdValue) => {
  if (!Number.isInteger(categoryIdValue)) {
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
    [categoryIdValue],
  );

  if (category.rows.length === 0) {
    throw new ErrorResponse("Category not found or inactive", 400);
  }
  return category.rows[0];
};

const validatePriority = (priorityValue) => {
  if (!PRIORITIES.includes(priorityValue)) {
    throw new ErrorResponse(
      `Priority must be one of ${PRIORITIES.join(", ")}`,
      400,
    );
  }
};

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

  await validateCallType(callTypeId);

  validatePriority(priority);

  const category = await validateCategory(categoryId);

  const assigneeId = category.assigneeId;

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
        RETURNING ${TICKET_COLUMNS}`,
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

const updateTicket = async (targetTicketId, data, authorId) => {
  const convertedTicketId = Number(targetTicketId);

  if (!Number.isInteger(convertedTicketId) || convertedTicketId < 1) {
    throw new ErrorResponse("Invalid id of ticketId", 400);
  }

  const hasUpdatableField = Object.keys(UPDATABLE_FIELDS).some(
    (key) => data[key] !== undefined,
  );

  if (!hasUpdatableField) {
    throw new ErrorResponse("No valid fields to update", 400);
  }

  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    throw new ErrorResponse(
      `Status must be one of ${STATUSES.join(", ")}`,
      400,
    );
  }

  if (data.priority !== undefined) {
    validatePriority(data.priority);
  }

  if (data.callTypeId !== undefined) {
    await validateCallType(data.callTypeId);
  }

  if (data.categoryId !== undefined) {
    await validateCategory(data.categoryId);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const findTicket = await client.query(
      `SELECT ${TICKET_COLUMNS} FROM ticket WHERE id = $1 FOR UPDATE`,
      [convertedTicketId],
    );

    if (findTicket.rows.length === 0) {
      throw new ErrorResponse("Ticket not found", 404);
    }

    const oldTicket = findTicket.rows[0];
    const changes = [];
    const setClauses = [];
    const values = [];

    for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
      if (data[key] !== undefined && data[key] !== oldTicket[key]) {
        values.push(data[key]);
        setClauses.push(`${column} = $${values.length}`);
        changes.push({
          field: key,
          oldValue: oldTicket[key],
          newValue: data[key],
        });
      }
    }

    const statusChanged = changes.some((change) => change.field === "status");

    if (statusChanged) {
      const categoryId = data.categoryId ?? oldTicket.categoryId;

      const categoryResult = await client.query(
        `SELECT "slaHours" FROM category WHERE id = $1`,
        [categoryId],
      );

      const sla = computeSla(
        oldTicket,
        data.status,
        new Date(),
        categoryResult.rows[0].slaHours,
      );

      for (const [key, value] of Object.entries(sla)) {
        values.push(value);
        setClauses.push(`"${key}" = $${values.length}`);
      }
    }

    values.push(convertedTicketId);

    if (changes.length === 0) {
      const ticketResult = await client.query(
        `SELECT ${TICKET_COLUMNS} FROM ticket WHERE id = $1`,
        [convertedTicketId],
      );
      await client.query("COMMIT");

      return ticketResult.rows[0];
    }

    const sql = `UPDATE ticket SET "updatedAt" = NOW(), ${setClauses.join(", ")}
             WHERE id = $${values.length}
             RETURNING ${TICKET_COLUMNS}`;

    const ticket = await client.query(sql, values);

    const ticketChangeResult = await client.query(
      `INSERT INTO ticket_change ("ticketId", "changedById")
        VALUES ($1, $2)
        RETURNING id`,
      [convertedTicketId, authorId],
    );

    const ticketChange = ticketChangeResult.rows[0];

    for (const change of changes) {
      await client.query(
        `INSERT INTO ticket_change_item ("changeId", field, "oldValue", "newValue")
          VALUES ($1, $2, $3, $4)`,
        [
          ticketChange.id,
          change.field,
          change.oldValue === null ? null : String(change.oldValue),
          change.newValue === null ? null : String(change.newValue),
        ],
      );
    }

    await client.query("COMMIT");
    return ticket.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { createTicket, updateTicket };
