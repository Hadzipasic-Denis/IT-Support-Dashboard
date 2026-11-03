const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createTicket,
  getTickets,
  getTicket,
  getUserTickets,
  getUserTicket,
  updateTicket
} = require("../controllers/ticket-controller");

const ticketRouter = express.Router();

ticketRouter.route("/create").post(authenticate, createTicket);
ticketRouter
  .route("/getAllTickets")
  .get(authenticate, authorize("ADMIN", "AGENT"), getTickets);
ticketRouter.route("/getUserTickets").get(authenticate, getUserTickets);
ticketRouter
  .route("/getTicket/:id")
  .get(authenticate, authorize("ADMIN", "AGENT"), getTicket);
ticketRouter.route("/getUserTicket/:id").get(authenticate, getUserTicket);
ticketRouter
  .route("/updateTicket/:id")
  .patch(authenticate, authorize("ADMIN", "AGENT"), updateTicket);
module.exports = ticketRouter;
