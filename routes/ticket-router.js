const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createTicket,
  getTickets,
  getTicket,
  getUserTickets,
  getUserTicket,
  updateTicket,
  getTicketHistory,
  addAssignee,
  removeAssignee,
  addComment,
  getComments,
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
ticketRouter.route("/getTicketHistory/:id").get(authenticate, getTicketHistory);
ticketRouter.route("/addComment/:id").post(authenticate, addComment);
ticketRouter.route("/getComments/:id").get(authenticate, getComments);
ticketRouter
  .route("/addAssignee/:id")
  .post(authenticate, authorize("ADMIN", "AGENT"), addAssignee);
ticketRouter
  .route("/removeAssignee/:id/:userId")
  .delete(authenticate, authorize("ADMIN", "AGENT"), removeAssignee);

module.exports = ticketRouter;
