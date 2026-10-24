const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const { createCallType } = require("../controllers/call-type-controller");

const callTypeRouter = express.Router();

callTypeRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCallType);

module.exports = callTypeRouter;
