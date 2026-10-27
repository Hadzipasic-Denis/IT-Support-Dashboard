const express = require("express");

const { authenticate } = require("../middlewares/authenticate");
const { createTicket } = require("../controllers/ticket-controller");

const ticketRouter = express.Router();

ticketRouter.route("/create").post(authenticate, createTicket);

module.exports = ticketRouter;
