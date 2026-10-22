const express = require("express");
const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createLocation,
  updateLocation,
} = require("../controllers/location-controller");

const locationRouter = express.Router();

locationRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createLocation);
locationRouter
  .route("/update/:id")
  .put(authenticate, authorize("ADMIN"), updateLocation);

module.exports = locationRouter;
