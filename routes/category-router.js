const express = require("express");
const { authenticate, authorize } = require("../middlewares/authenticate");
const createCategory = require("../controllers/category-controller");

const categoryRouter = express.Router();

categoryRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCategory);

module.exports = categoryRouter;
