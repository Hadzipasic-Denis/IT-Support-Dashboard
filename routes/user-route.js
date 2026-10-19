const express = require("express");

const { getUser } = require("../controllers/user-controller");

const userRouter = express.Router();

userRouter.route("/:id").get(getUser);

module.exports = userRouter;
