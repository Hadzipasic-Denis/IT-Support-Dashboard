const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createTicket,
  getTickets,
} = require("../controllers/ticket-controller");

const ticketRouter = express.Router();

ticketRouter.route("/create").post(authenticate, createTicket);
ticketRouter
  .route("/getAllTickets")
  .get(authenticate, authorize("ADMIN", "AGENT"), getTickets);

module.exports = ticketRouter;
