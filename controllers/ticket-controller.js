const asyncWrapper = require("../utils/asyncWrapper.js");
const ticketService = require("../services/ticket-service.js");
const pool = require("../db.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const createTicket = asyncWrapper(async (req, res, next) => {
  const { subject, description, categoryId, callTypeId } = req.body;

  const isStaff = ["AGENT", "ADMIN"].includes(req.user.role);

  const contactEmail =
    isStaff && req.body.contactEmail ? req.body.contactEmail : req.user.email;

  const priority = isStaff && req.body.priority ? req.body.priority : "MEDIUM";

  const ticket = await ticketService.createTicket(
    { subject, description, categoryId, callTypeId, contactEmail, priority },
    req.user.id,
  );

  res.status(201).json(ticket);
});

const getTickets = asyncWrapper(async (req, res, next) => {
  const tickets = await pool.query(`
    SELECT * FROM ticket WHERE status != 'DONE'
    `);

  res.status(200).json(tickets.rows);
});

const getTicket = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const ticket = await pool.query(
    `
    SELECT * FROM ticket WHERE id = $1
    `,
    [id],
  );

  if (ticket.rows.length === 0) {
    throw new ErrorResponse("Ticket not found", 404);
  }

  res.status(200).json(ticket.rows[0]);
});

const getUserTickets = asyncWrapper(async (req, res, next) => {
  const { id } = req.user;

  const tickets = await pool.query(
    `
    SELECT * FROM ticket WHERE "requesterId" = $1
    `,
    [id],
  );

  res.status(200).json(tickets.rows);
});

const getUserTicket = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  const ticket = await pool.query(
    `
    SELECT id, "ticketNumber", subject, description, status, priority, "categoryId", "callTypeId", "contactEmail", "requesterId", "createdById", source, "submittedAt"
    FROM ticket WHERE id = $1 AND "requesterId" = $2
    `,
    [id, userId],
  );

  if (ticket.rows.length === 0) {
    throw new ErrorResponse("Ticket not found", 404);
  }

  res.status(200).json(ticket.rows[0]);
});

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  getUserTickets,
  getUserTicket,
};
