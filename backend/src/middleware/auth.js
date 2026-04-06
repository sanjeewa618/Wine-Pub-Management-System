const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/ApiError");
const { User } = require("../models/User");

async function protect(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;

  if (!token) {
    return next(new ApiError(401, "Not authorized, token missing"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      return next(new ApiError(401, "User not found"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, "Not authorized, token invalid"));
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authorized"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    next();
  };
}

module.exports = { protect, authorize };
