const express = require("express");

const { getUser, getAllUsers } = require("../controllers/user-controller");

const userRouter = express.Router();

userRouter.route("/getAllUsers").get(getAllUsers);
userRouter.route("/:id").get(getUser);

module.exports = userRouter;
