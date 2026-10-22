const express = require("express");
const { authenticate, authorize } = require("../middlewares/authenticate");
const { createLocation } = require("../controllers/location-controller");

const locationRouter = express.Router();

locationRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createLocation);

module.exports = locationRouter;
