require("dotenv/config");
require("./db.js");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const errorHandler = require("./middlewares/errorHandler.js");

const authRouter = require("./routes/auth-router.js");
const userRouter = require("./routes/user-router.js");
const locationRouter = require("./routes/location-router.js");
const callTypeRouter = require("./routes/call-type-router.js");
const categoryRouter = require("./routes/category-router.js");
const ticketRouter = require("./routes/ticket-router.js");

const port = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/location", locationRouter);
app.use("/callType", callTypeRouter);
app.use("/category", categoryRouter);
app.use("/ticket", ticketRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
