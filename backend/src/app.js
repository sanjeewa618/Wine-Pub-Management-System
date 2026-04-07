const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const sellerProductRoutes = require("./routes/sellerProductRoutes");

require("dotenv").config();

const app = express();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Keep auth endpoints out of global throttling so heavy dashboard polling does not block sign-in.
  skip: (req) => req.path.startsWith("/api/auth/login") || req.path.startsWith("/api/auth/register"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication requests, please try again later.",
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const configured = process.env.CLIENT_URL;
      const isLocalhostDev = /^https?:\/\/localhost:\d+$/i.test(origin);

      if (!configured || origin === configured || isLocalhostDev) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(globalLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Wine Pub API is running" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/wines", productRoutes);
app.use("/api/bites", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/seller-products", sellerProductRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
