require("dotenv/config");
require("./db.js");

const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler.js");

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

app.use(errorHandler)

app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
