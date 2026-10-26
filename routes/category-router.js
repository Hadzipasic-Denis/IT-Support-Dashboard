const express = require("express");

const { authenticate, authorize } = require("../middlewares/authenticate");
const {
  createCategory,
  deleteCategory,
  getCategory,
  getAllCategories,
  updateCategory,
} = require("../controllers/category-controller");

const categoryRouter = express.Router();

categoryRouter
  .route("/create")
  .post(authenticate, authorize("ADMIN"), createCategory);
categoryRouter
  .route("/update/:id")
  .patch(authenticate, authorize("ADMIN"), updateCategory);
categoryRouter
  .route("/delete/:id")
  .delete(authenticate, authorize("ADMIN"), deleteCategory);
categoryRouter
  .route("/getAllCategories")
  .get(authenticate, authorize("AGENT", "ADMIN"), getAllCategories);
categoryRouter
  .route("/getCategory/:id")
  .get(authenticate, authorize("AGENT", "ADMIN"), getCategory);

module.exports = categoryRouter;
