const express = require("express");

const {
  register,
  login,
  logout,
  getProfile,
} = require("../controllers/auth-controller");
const { authenticate, authorize } = require("../middlewares/authenticate");

const authRouter = express.Router();

authRouter.route("/login").post(login);
authRouter.route("/logout").put(logout);
authRouter.route("/getProfile").get(authenticate, getProfile);
authRouter.route("/register").post(authenticate, authorize("ADMIN"), register);

module.exports = authRouter;
