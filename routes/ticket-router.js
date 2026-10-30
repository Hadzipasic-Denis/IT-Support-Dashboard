const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createTicket,
  getTickets,
  getTicket,
} = require("../controllers/ticket-controller");

const ticketRouter = express.Router();

ticketRouter.route("/create").post(authenticate, createTicket);
ticketRouter
  .route("/getAllTickets")
  .get(authenticate, authorize("ADMIN", "AGENT"), getTickets);
ticketRouter
  .route("/getTicket/:id")
  .get(authenticate, authorize("ADMIN", "AGENT"), getTicket);

module.exports = ticketRouter;
