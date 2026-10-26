// Postgres error codes that are caused by the client, not by the server
const PG_ERRORS = {
  "23505": { status: 409, message: "Already exists" }, // unique_violation
  "22P02": { status: 400, message: "Invalid input" }, // invalid_text_representation
};

const errorHandler = (err, req, res, next) => {
  console.log(err);

  const pgError = PG_ERRORS[err.code];
  if (pgError) {
    return res.status(pgError.status).send(pgError.message);
  }

  res
    .status(err.statusCode || 500)
    .send(
      err.statusCode && err.message
        ? err.message
        : "Something went wrong!",
    );
};

module.exports = errorHandler;
