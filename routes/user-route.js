const express = require("express");

const {
  getUser,
  getAllUsers,
  deleteUser,
} = require("../controllers/user-controller");

const userRouter = express.Router();

userRouter.route("/getAllUsers").get(getAllUsers);
userRouter.route("/:id").get(getUser).delete(deleteUser);

module.exports = userRouter;
