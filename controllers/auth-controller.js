const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const register = asyncWrapper(async (req, res, next) => {
  const { email, name, password } = req.body;

  const lowercaseEmail = email.toLowerCase();

  const findUser = await pool.query(`SELECT * FROM app_user WHERE email = $1`, [
    lowercaseEmail,
  ]);

  if (findUser.rows.length > 0) {
    throw new ErrorResponse("User already registered!", 409);
  }

  const user = await pool.query(
    `INSERT INTO app_user (name, email, password) 
            VALUES ($1, $2, $3) RETURNING id, name, email, role`,
    [name, lowercaseEmail, password],
  );

  res.status(201).json(user.rows[0]);
});

module.exports = {
  register,
};
