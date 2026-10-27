const asyncWrapper = require("../utils/asyncWrapper.js");
const ticketService = require("../services/ticket-service.js");

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

module.exports = {
  createTicket,
};
