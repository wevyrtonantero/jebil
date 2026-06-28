const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const { frontendUrl, uploadDir } = require("./config/env");
const apiRoutes = require("./routes");
const { requestLoggerMiddleware } = require("./middlewares/requestLoggerMiddleware");
const { notFoundMiddleware } = require("./middlewares/notFoundMiddleware");
const { errorMiddleware } = require("./middlewares/errorMiddleware");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(requestLoggerMiddleware);
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), uploadDir)));

app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
