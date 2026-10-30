const express = require("express");

const {
  getUser,
  getAllUsers,
  deleteUser,
  updateUser,
} = require("../controllers/user-controller");
const { authenticate, authorize } = require("../middlewares/authenticate");

const userRouter = express.Router();

userRouter.use(authenticate)

userRouter.route("/getAllUsers").get(authenticate, authorize("ADMIN"), getAllUsers);
userRouter
  .route("/:id")
  .get(authorize("ADMIN"), getUser)
  .delete(authorize("ADMIN"), deleteUser)
  .patch(authorize("ADMIN"), updateUser);

module.exports = userRouter;
