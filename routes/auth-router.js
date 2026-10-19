const express = require("express");

const { register } = require("../controllers/auth-controller");

const authRouter = express.Router();

authRouter.route("/register").post(register);

module.exports = authRouter;
