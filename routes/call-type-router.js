const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createCallType,
  updateCallType,
} = require("../controllers/call-type-controller");

const callTypeRouter = express.Router();

callTypeRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCallType);
callTypeRouter
  .route("/update/:id")
  .put(authenticate, authorize("ADMIN"), updateCallType);
  
module.exports = callTypeRouter;
