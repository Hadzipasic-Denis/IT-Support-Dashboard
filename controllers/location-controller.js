const pool = require("../db.js");
const asyncWrapper = require("../utils/asyncWrapper.js");
const ErrorResponse = require("../utils/ErrorResponse.js");

const createLocation = asyncWrapper(async (req, res, next) => {
  const { name } = req.body;

  const location = await pool.query(
    `INSERT INTO location (name) 
            VALUES ($1) RETURNING *`,
    [name],
  );

  res.status(201).json(location.rows[0]);
});

module.exports = {
    createLocation
}