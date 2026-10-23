const express = require("express");
const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocation,
  getAllLocations,
} = require("../controllers/location-controller");

const locationRouter = express.Router();

locationRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createLocation);
locationRouter
  .route("/update/:id")
  .put(authenticate, authorize("ADMIN"), updateLocation);
locationRouter
  .route("/delete/:id")
  .delete(authenticate, authorize("ADMIN"), deleteLocation);
  locationRouter
  .route("/getAllLocations")
  .get(authenticate, authorize("ADMIN"), getAllLocations);
locationRouter
  .route("/getLocation/:id")
  .get(authenticate, authorize("ADMIN"), getLocation);


module.exports = locationRouter;
