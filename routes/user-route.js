const express = require("express");

const {
  getUser,
  getAllUsers,
  deleteUser,
  updateUser,
} = require("../controllers/user-controller");

const userRouter = express.Router();

userRouter.route("/getAllUsers").get(getAllUsers);
userRouter.route("/:id").get(getUser).delete(deleteUser).patch(updateUser);

module.exports = userRouter;
