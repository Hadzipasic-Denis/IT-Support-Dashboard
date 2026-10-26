const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createCategory,
  deleteCategory,
} = require("../controllers/category-controller");

const categoryRouter = express.Router();

categoryRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCategory);
categoryRouter
  .route("/delete/:id")
  .delete(authenticate, authorize("ADMIN"), deleteCategory);
module.exports = categoryRouter;
