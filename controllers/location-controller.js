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

const updateLocation = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  const location = await pool.query(
    `UPDATE location SET name = $1
             WHERE id = $2
             RETURNING *`,
    [name, id],
  );

  if (location.rows.length <= 0) {
    throw new ErrorResponse("Location not found", 404);
  }

  res.status(200).json(location.rows[0]);
});

const deleteLocation = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const location = await pool.query(
    `UPDATE location
     SET "isActive" = false
   WHERE id = $1`,
    [id],
  );

  if (location.rowCount === 0) {
    throw new ErrorResponse("Location not found", 404);
  }

  res.status(200).json({ message: "Location deactivated" });
});

const getLocation = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const location = await pool.query(`SELECT * FROM location WHERE id = $1`, [
    id,
  ]);

  if (location.rows.length <= 0) {
    throw new ErrorResponse("Location not found", 404);
  }

  res.status(200).json(location.rows[0]);
});

const getAllLocations = asyncWrapper(async (req, res, next) => {
  const locations = await pool.query(
    `SELECT *
     FROM location
  `,
  );

  res.status(200).json(locations.rows);
});

module.exports = {
  createLocation,
  updateLocation,
  deleteLocation,
  getLocation,
  getAllLocations,
};
