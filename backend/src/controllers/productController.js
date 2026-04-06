const { Product } = require("../models/Product");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

function getProductType(req) {
  return req.productType || (req.baseUrl.includes("bites") ? "bite" : "wine");
}

function getAllowedTypesByRoute(productType) {
  const wineTypes = ["wine", "arrack", "whiskey", "whisky", "rum", "beer"];
  const biteTypes = ["bite", "food", "beverage"];

  return productType === "wine" ? wineTypes : biteTypes;
}

function resolveProductType(productType, requestedType) {
  const allowedTypes = getAllowedTypesByRoute(productType);
  return allowedTypes.includes(requestedType) ? requestedType : allowedTypes[0];
}

function normalizeSizesForPayload(payload, productType) {
  const normalized = { ...payload };

  if (!Array.isArray(normalized.sizes)) {
    return normalized;
  }

  if (productType === "wine") {
    normalized.sizes = normalized.sizes
      .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry?.size || "").trim()))
      .filter(Boolean);
    return normalized;
  }

  // Bites can be submitted as: [{ size: "Regular", price: 900 }, ...]
  // Convert to both `sizes` and `sizePricing` to match current schema and UI usage.
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

function normalizeProductPayload(body, productType) {
  const requestedType = String(body?.productType || "").toLowerCase();
  const resolvedType = resolveProductType(productType, requestedType);

  const payload = {
    ...body,
    productType: resolvedType,
  };

  return normalizeSizesForPayload(payload, productType);
}

const listProducts = asyncHandler(async (req, res) => {
  const productType = getProductType(req);
  const { category, brand, country, originType, minPrice, maxPrice, search } = req.query;

  const filter = {
    productType:
      productType === "wine"
        ? { $in: ["wine", "arrack", "whiskey", "whisky", "rum", "beer"] }
        : { $in: ["bite", "food", "beverage"] },
    isActive: { $ne: false },
  };

  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (country) filter.country = country;
  if (originType) filter.originType = originType;
  if (search) filter.name = { $regex: search, $options: "i" };

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, items: products });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, item: product });
});

const createProduct = asyncHandler(async (req, res) => {
  const productType = getProductType(req);
  const payload = normalizeProductPayload(req.body, productType);
  const product = await Product.create(payload);
  res.status(201).json({ success: true, item: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const productType = getProductType(req);
  const payload = normalizeProductPayload(req.body, productType);
  const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, item: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, message: "Product removed" });
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
