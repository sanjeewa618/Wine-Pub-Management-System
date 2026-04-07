const { SellerProduct } = require("../models/SellerProduct");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

const ALLOWED_TYPES = ["wine", "arrack", "whiskey", "whisky", "rum", "vodka", "beer", "bite", "food", "beverage"];

function normalizeSizesForPayload(payload) {
  const normalized = { ...payload };

  if (!Array.isArray(normalized.sizes)) {
    return normalized;
  }

  const isBiteLike = ["bite", "food", "beverage"].includes(String(normalized.productType || "").toLowerCase());
  if (!isBiteLike) {
    normalized.sizes = normalized.sizes
      .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry?.size || "").trim()))
      .filter(Boolean);
    return normalized;
  }

  const parsedEntries = normalized.sizes
    .map((entry) => {
      if (typeof entry === "string") {
        const cleanedSize = entry.trim();
        return cleanedSize ? { size: cleanedSize, price: Number(normalized.price || 0) } : null;
      }

      const cleanedSize = String(entry?.size || "").trim();
      if (!cleanedSize) return null;

      const parsedPrice = Number(entry?.price);
      return {
        size: cleanedSize,
        price: Number.isFinite(parsedPrice) ? parsedPrice : Number(normalized.price || 0),
      };
    })
    .filter(Boolean);

  normalized.sizePricing = parsedEntries;
  normalized.sizes = parsedEntries.map((entry) => entry.size);
  return normalized;
}

function normalizeProductPayload(body) {
  const requestedType = String(body?.productType || "").toLowerCase();
  const resolvedType = ALLOWED_TYPES.includes(requestedType) ? requestedType : "wine";

  const payload = {
    ...body,
    productType: resolvedType,
  };

  return normalizeSizesForPayload(payload);
}

function buildListFilter(req) {
  const filter = { isActive: { $ne: false } };

  if (String(req.user?.role || "") === "seller") {
    filter.sellerId = req.user._id;
    return filter;
  }

  if (req.query?.sellerId) {
    filter.sellerId = req.query.sellerId;
  }

  return filter;
}

const listSellerProducts = asyncHandler(async (req, res) => {
  const items = await SellerProduct.find(buildListFilter(req)).sort({ updatedAt: -1, createdAt: -1 });
  res.json({ success: true, items });
});

const getSellerProduct = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (String(req.user?.role || "") === "seller") {
    filter.sellerId = req.user._id;
  }

  const item = await SellerProduct.findOne(filter);
  if (!item) throw new ApiError(404, "Seller product not found");
  res.json({ success: true, item });
});

const createSellerProduct = asyncHandler(async (req, res) => {
  const payload = normalizeProductPayload(req.body);
  const sellerId = String(req.user?.role || "") === "seller" ? req.user._id : payload.sellerId;

  if (!sellerId) {
    throw new ApiError(400, "sellerId is required");
  }

  const item = await SellerProduct.create({
    ...payload,
    sellerId,
  });

  res.status(201).json({ success: true, item });
});

const updateSellerProduct = asyncHandler(async (req, res) => {
  const payload = normalizeProductPayload(req.body);
  const filter = { _id: req.params.id };

  if (String(req.user?.role || "") === "seller") {
    filter.sellerId = req.user._id;
  }

  const item = await SellerProduct.findOne(filter);
  if (!item) throw new ApiError(404, "Seller product not found");

  const safePayload = { ...payload };
  if (String(req.user?.role || "") === "seller") {
    safePayload.sellerId = req.user._id;
  }

  Object.assign(item, safePayload);
  await item.save();

  res.json({ success: true, item });
});

const deleteSellerProduct = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (String(req.user?.role || "") === "seller") {
    filter.sellerId = req.user._id;
  }

  const item = await SellerProduct.findOneAndDelete(filter);
  if (!item) throw new ApiError(404, "Seller product not found");
  res.json({ success: true, message: "Seller product removed" });
});

module.exports = {
  listSellerProducts,
  getSellerProduct,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
};