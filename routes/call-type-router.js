const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createCallType,
  updateCallType,
  deleteCallType,
  getAllCallTypes,
  getCallType,
} = require("../controllers/call-type-controller");

const callTypeRouter = express.Router();

callTypeRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCallType);
callTypeRouter
  .route("/update/:id")
  .put(authenticate, authorize("ADMIN"), updateCallType);
callTypeRouter
  .route("/delete/:id")
  .delete(authenticate, authorize("ADMIN"), deleteCallType);
callTypeRouter
  .route("/getAllCallTypes")
  .get(authenticate, authorize("ADMIN"), getAllCallTypes);
callTypeRouter
  .route("/getCallType/:id")
  .get(authenticate, authorize("ADMIN"), getCallType);

module.exports = callTypeRouter;
