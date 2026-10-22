const express = require("express");

const { register, login } = require("../controllers/auth-controller");

const authRouter = express.Router();

authRouter.route("/login").post(login);
authRouter.route("/register").post(register);

module.exports = authRouter;
