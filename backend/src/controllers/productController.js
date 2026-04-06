const { Product } = require("../models/Product");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

function getProductType(req) {
  return req.productType || (req.baseUrl.includes("bites") ? "bite" : "wine");
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
  const payload = { ...req.body, productType };
  const product = await Product.create(payload);
  res.status(201).json({ success: true, item: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, item: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  res.json({ success: true, message: "Product removed" });
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
