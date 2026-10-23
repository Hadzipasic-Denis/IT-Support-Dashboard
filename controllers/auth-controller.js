const pool = require("../db.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncWrapper = require("../utils/asyncWrapper.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const register = asyncWrapper(async (req, res, next) => {
  const { email, name, password } = req.body;

  const lowercaseEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const findUser = await pool.query(`SELECT * FROM app_user WHERE email = $1`, [
    lowercaseEmail,
  ]);

  if (findUser.rows.length > 0) {
    throw new ErrorResponse("User already registered!", 409);
  }

  const user = await pool.query(
    `INSERT INTO app_user (name, email, password) 
            VALUES ($1, $2, $3) RETURNING id, name, email, role`,
    [name, lowercaseEmail, hashedPassword],
  );

  res.status(201).json(user.rows[0]);
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  const lowercaseEmail = email.toLowerCase();

  const findUser = await pool.query("SELECT * FROM app_user WHERE email = $1", [
    lowercaseEmail,
  ]);

  const user = findUser.rows[0];

  if (!user) {
    throw new ErrorResponse("Invalid email or password", 401);
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw new ErrorResponse("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new ErrorResponse("Account is deactivated", 403);
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "480m",
  });

  res
    .cookie("access_token", token, { httpOnly: true, maxAge: 28800000 })
    .json(payload);
});

const logout = asyncWrapper(async (req, res, next) => {
  res
    .cookie("access_token", "", { httpOnly: true, maxAge: 0 })
    .json({ message: "Success" });
});

const getProfile = asyncWrapper(async (req, res, next) => {
  const { id } = req.user;

  const user = await pool.query(
    `SELECT id, name, email, "locationId", "isActive" FROM app_user WHERE id = $1`,
    [id],
  );

  if (user.rows.length <= 0) {
    throw new ErrorResponse("User not found", 404);
  }

  res.status(200).json(user.rows[0]);
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
};
