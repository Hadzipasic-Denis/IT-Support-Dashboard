const express = require("express");

const { register, login, logout } = require("../controllers/auth-controller");

const authRouter = express.Router();

authRouter.route("/login").post(login);
authRouter.route("/logout").put(logout);
authRouter.route("/register").post(register);

module.exports = authRouter;
