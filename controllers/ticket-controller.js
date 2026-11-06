const asyncWrapper = require("../utils/asyncWrapper.js");
const ticketService = require("../services/ticket-service.js");
const pool = require("../db.js");
const ErrorResponse = require("../utils/ErrorResponse.js");
const { withSlaState } = require("../services/sla-service.js");

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
    SELECT t.*, 
    COALESCE(c."slaHours", 120) as "slaHours"
    FROM ticket t
    LEFT JOIN category c ON c.id = t."categoryId"
    WHERE t.status != 'DONE'
    `);

  const now = new Date();
  res.status(200).json(tickets.rows.map((ticket) => withSlaState(ticket, now)));
});

const getTicket = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const ticket = await pool.query(
    `
    SELECT t.*,
    COALESCE(c."slaHours", 120) as "slaHours"
    FROM ticket t
    LEFT JOIN category c ON c.id = t."categoryId"
    WHERE t.id = $1
    `,
    [id],
  );

  if (ticket.rows.length === 0) {
    throw new ErrorResponse("Ticket not found", 404);
  }

  const now = new Date();
  res.status(200).json(withSlaState(ticket.rows[0], now));
});

const getUserTickets = asyncWrapper(async (req, res, next) => {
  const { id } = req.user;

  const tickets = await pool.query(
    `
    SELECT t.id, t."ticketNumber", t.subject, t.description, t.status, t.priority, t."categoryId", t."callTypeId", t."contactEmail", t."requesterId", t."createdById", t.source, t."submittedAt", t."slaWorkedSeconds", t."slaClockStartedAt", t."slaBreachAt", t."slaBreachedAt", t."resolvedAt",
    COALESCE(c."slaHours", 120) as "slaHours"
    FROM ticket t
    LEFT JOIN category c ON c.id = t."categoryId"
    WHERE t."requesterId" = $1
    `,
    [id],
  );

  const now = new Date();
  res.status(200).json(tickets.rows.map((ticket) => withSlaState(ticket, now)));
});

const getUserTicket = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  const ticket = await pool.query(
    `
    SELECT t.id, t."ticketNumber", t.subject, t.description, t.status, t.priority, t."categoryId", t."callTypeId", t."contactEmail", t."requesterId", t."createdById", t.source, t."submittedAt", t."slaWorkedSeconds", t."slaClockStartedAt", t."slaBreachAt", t."slaBreachedAt", t."resolvedAt",
    COALESCE(c."slaHours", 120) AS "slaHours"
    FROM ticket t 
    LEFT JOIN category c ON c.id = t."categoryId"
    WHERE t.id = $1 AND t."requesterId" = $2
    `,
    [id, userId],
  );

  if (ticket.rows.length === 0) {
    throw new ErrorResponse("Ticket not found", 404);
  }

  const now = new Date();
  res.status(200).json(withSlaState(ticket.rows[0], now));
});

const updateTicket = asyncWrapper(async (req, res, next) => {
  const { id: ticketId } = req.params;
  const { id: userId } = req.user;
  const { status, priority, categoryId, callTypeId } = req.body;

  const ticket = await ticketService.updateTicket(
    ticketId,
    { status, priority, categoryId, callTypeId },
    userId,
  );

  res.status(200).json(ticket);
});

const getTicketHistory = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const ticketHistory = await ticketService.getTicketHistory(id, req.user);

  res.status(200).json(ticketHistory);
});

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  getUserTickets,
  getUserTicket,
  updateTicket,
  getTicketHistory,
};
