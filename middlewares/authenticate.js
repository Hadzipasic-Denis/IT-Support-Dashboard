const jwt = require("jsonwebtoken");
const pool = require("../db.js");
const ErrorResponse = require("../utils/ErrorResponse");
const asyncWrapper = require("../utils/asyncWrapper");

const authenticate = asyncWrapper(async (req, res, next) => {
  const {
    cookies: { access_token: token },
  } = req;

  if (!token) {
    throw new ErrorResponse("Unauthorized!", 401);
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const { rows } = await pool.query(
    `SELECT id, name, email, role, "isActive" FROM app_user WHERE id = $1`,
    [payload.id],
  );
  const user = rows[0];

  if (!user || !user.isActive) {
    throw new ErrorResponse("Not authenticated", 401);
  }

  req.user = user;

  next();
});

const authorize = (role) => {
  return (req, res, next) => {
    if (role === req.user.role) {
      return next();
    } else {
      throw new ErrorResponse("Insufficient permissions!", 403);
    }
  };
};

module.exports = { authenticate, authorize };
