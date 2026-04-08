import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ShoppingCart, Star } from "lucide-react";
import { useApp } from "../context/AppContext";

const formatLkr = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;
const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1000";

const formatCategoryLabel = (value: string) => {
  if (!value) return "Uncategorized";
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getLiquorCategoryKey = (item: { category?: string; productType?: string }) => {
  const rawValue = String(item.category || item.productType || "Uncategorized").trim();
  if (!rawValue) {
    return "Uncategorized";
  }

  const normalized = rawValue.toLowerCase();
  if (normalized === "whisky" || normalized === "whiskey") return "Whiskey";
  if (normalized === "vodka") return "Vodka";
  if (normalized === "arrack") return "Arrack";
  if (normalized === "rum") return "Rum";
  if (normalized === "beer") return "Beer";
  if (normalized === "wine") return "Wine";

  return rawValue;
};

export const WinesPage = () => {
  const { products, addToCart } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingMinPrice, setPendingMinPrice] = useState(0);
  const [pendingMaxPrice, setPendingMaxPrice] = useState(0);
  const [pendingCategory, setPendingCategory] = useState("all");
  const [pendingBrand, setPendingBrand] = useState("any");
  const [pendingSize, setPendingSize] = useState("all");
  const [pendingCountry, setPendingCountry] = useState("any");
  const [pendingType, setPendingType] = useState("all");

  const [activeMinPrice, setActiveMinPrice] = useState(0);
  const [activeMaxPrice, setActiveMaxPrice] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState("any");
  const [activeSize, setActiveSize] = useState("all");
  const [activeCountry, setActiveCountry] = useState("any");
  const [activeType, setActiveType] = useState("all");

  const liquorProducts = useMemo(() => products.filter((item) => item.type === "wine"), [products]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    liquorProducts.forEach((item) => {
      const categoryKey = getLiquorCategoryKey(item as { category?: string; productType?: string });
      map.set(categoryKey, (map.get(categoryKey) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [liquorProducts]);

  const categoryScopedProducts = useMemo(() => {
    if (pendingCategory === "all") {
      return liquorProducts;
    }

    return liquorProducts.filter((item) => getLiquorCategoryKey(item as { category?: string; productType?: string }) === pendingCategory);
  }, [liquorProducts, pendingCategory]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    categoryScopedProducts.forEach((item) => {
      if (item.brand) {
        set.add(item.brand);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoryScopedProducts]);

  React.useEffect(() => {
    if (pendingBrand === "any") {
      return;
    }

    if (!brands.includes(pendingBrand)) {
      setPendingBrand("any");
    }
  }, [brands, pendingBrand]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    liquorProducts.forEach((item) => {
      if (item.country) {
        set.add(item.country);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [liquorProducts]);

  const sizeCounts = useMemo(() => {
    const map = new Map<string, number>();
    liquorProducts.forEach((item) => {
      (item.sizes ?? []).forEach((size) => {
        map.set(size, (map.get(size) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([size, count]) => ({ size, count }));
  }, [liquorProducts]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    liquorProducts.forEach((item) => {
      const type = item.originType || "Unknown";
      map.set(type, (map.get(type) || 0) + 1);
    });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [liquorProducts]);

  const priceBounds = useMemo(() => {
    if (!liquorProducts.length) {
      return { min: 0, max: 0 };
    }

    const prices = liquorProducts.map((item) => item.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [liquorProducts]);

  React.useEffect(() => {
    const min = priceBounds.min;
    const max = priceBounds.max;

    setPendingMinPrice(min);
    setPendingMaxPrice(max);
    setActiveMinPrice(min);
    setActiveMaxPrice(max);
  }, [priceBounds.min, priceBounds.max]);

  const filteredItems = useMemo(() => {
    return liquorProducts.filter((item) => {
      const itemCategory = getLiquorCategoryKey(item as { category?: string; productType?: string });
      const byCategory = activeCategory === "all" ? true : itemCategory === activeCategory;
      const bySearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const byPrice = item.price >= activeMinPrice && item.price <= activeMaxPrice;
      const byBrand = activeBrand === "any" ? true : item.brand === activeBrand;
      const bySize = activeSize === "all" ? true : (item.sizes ?? []).includes(activeSize);
      const byCountry = activeCountry === "any" ? true : item.country === activeCountry;
      const byType = activeType === "all" ? true : (item.originType || "Unknown") === activeType;

      return byCategory && bySearch && byPrice && byBrand && bySize && byCountry && byType;
    });
  }, [liquorProducts, activeCategory, searchTerm, activeMinPrice, activeMaxPrice, activeBrand, activeSize, activeCountry, activeType]);

  const applyFilters = () => {
    setActiveMinPrice(pendingMinPrice);
    setActiveMaxPrice(pendingMaxPrice);
    setActiveCategory(pendingCategory);
    setActiveBrand(pendingBrand);
    setActiveSize(pendingSize);
    setActiveCountry(pendingCountry);
    setActiveType(pendingType);
  };

  if (liquorProducts.length === 0) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
        <div className="container mx-auto text-center py-20">
          <h1 className="text-4xl md:text-5xl font-serif text-white font-bold mb-4">Liquor & Drinks</h1>
          <p className="text-gray-400">No liquor products found in database. Add a product in MongoDB and refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-white font-bold">
              {activeCategory === "all" ? "Liquor & Drinks" : formatCategoryLabel(activeCategory)}
            </h1>
            <p className="text-gray-400 mt-2">Products are loaded directly from your MongoDB backend.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          <aside className="bg-transparent border border-[#2b313b] rounded-xl p-6 text-[#e5e7eb]">
            <div className="mb-5">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-2">Search</p>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search product name"
                className="w-full bg-[#0c0f13] border border-[#343c48] rounded-md px-3 py-2 text-[#f3f4f6] placeholder:text-[#7e8795] focus:outline-none focus:border-[#E3C06A]"
              />
            </div>

            <div className="border-t border-[#2b313b] pt-5 space-y-6">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Filter by price</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={pendingMinPrice}
                    onChange={(event) => setPendingMinPrice(Number(event.target.value || 0))}
                    className="w-full bg-[#0c0f13] border border-[#343c48] rounded-md px-3 py-2 text-[#f3f4f6]"
                  />
                  <input
                    type="number"
                    value={pendingMaxPrice}
                    onChange={(event) => setPendingMaxPrice(Number(event.target.value || 0))}
                    className="w-full bg-[#0c0f13] border border-[#343c48] rounded-md px-3 py-2 text-[#f3f4f6]"
                  />
                </div>
                <p className="mt-3 text-sm text-[#c9ced8]">
                  Price: LKR {pendingMinPrice.toLocaleString()} - LKR {pendingMaxPrice.toLocaleString()}
                </p>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Categories</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 text-[#f3f4f6] cursor-pointer">
                    <span className="text-base">All Categories</span>
                    <span className="text-sm text-[#9ca3af]">({liquorProducts.length})</span>
                    <input
                      type="radio"
                      name="category-filter"
                      checked={pendingCategory === "all"}
                      onChange={() => setPendingCategory("all")}
                      className="accent-[#E3C06A]"
                    />
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.name} className="flex items-center justify-between gap-2 text-[#f3f4f6] cursor-pointer">
                      <span className="text-base">{formatCategoryLabel(cat.name)}</span>
                      <span className="text-sm text-[#9ca3af]">({cat.count})</span>
                      <input
                        type="radio"
                        name="category-filter"
                        checked={pendingCategory === cat.name}
                        onChange={() => setPendingCategory(cat.name)}
                        className="accent-[#E3C06A]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Filter by Brand</p>
                <select
                  value={pendingBrand}
                  onChange={(event) => setPendingBrand(event.target.value)}
                  className="w-full bg-[#0c0f13] border border-[#343c48] rounded-md px-3 py-2 text-[#f3f4f6]"
                >
                  <option value="any">Any Brand</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Filter by Size</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-base">All Sizes</span>
                    <input
                      type="radio"
                      name="size-filter"
                      checked={pendingSize === "all"}
                      onChange={() => setPendingSize("all")}
                      className="accent-[#E3C06A]"
                    />
                  </label>
                  {sizeCounts.map((entry) => (
                    <label key={entry.size} className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="text-base">{entry.size}</span>
                      <span className="text-sm text-[#9ca3af]">({entry.count})</span>
                      <input
                        type="radio"
                        name="size-filter"
                        checked={pendingSize === entry.size}
                        onChange={() => setPendingSize(entry.size)}
                        className="accent-[#E3C06A]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Country of Origin</p>
                <select
                  value={pendingCountry}
                  onChange={(event) => setPendingCountry(event.target.value)}
                  className="w-full bg-[#0c0f13] border border-[#343c48] rounded-md px-3 py-2 text-[#f3f4f6]"
                >
                  <option value="any">Any Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#E3C06A] mb-3">Filter by Type</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-base">All Types</span>
                    <input
                      type="radio"
                      name="type-filter"
                      checked={pendingType === "all"}
                      onChange={() => setPendingType("all")}
                      className="accent-[#E3C06A]"
                    />
                  </label>
                  {typeCounts.map((entry) => (
                    <label key={entry.type} className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="text-base">{entry.type}</span>
                      <span className="text-sm text-[#9ca3af]">({entry.count})</span>
                      <input
                        type="radio"
                        name="type-filter"
                        checked={pendingType === entry.type}
                        onChange={() => setPendingType(entry.type)}
                        className="accent-[#E3C06A]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#2b313b] pt-5">
                <button
                  onClick={applyFilters}
                  className="w-full bg-[#E3C06A] text-black text-sm font-semibold rounded-md px-4 py-2.5 hover:bg-[#CDA74C] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </aside>

          <div>
            {activeCategory !== "all" && (
              <button
                onClick={() => {
                  setPendingCategory("all");
                  setActiveCategory("all");
                }}
                className="inline-flex items-center text-sm text-[#E3C06A] hover:text-white transition-colors mb-4"
              >
                <ArrowLeft size={15} className="mr-2" /> Back to All Wines
              </button>
            )}

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
            >
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                  className="bg-[#111] border border-[#222] rounded-xl overflow-hidden group hover:border-[#E3C06A]/50 transition-colors"
                >
                  <div className="h-52 relative overflow-hidden bg-black">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(event) => {
                        const target = event.currentTarget;
                        target.onerror = null;
                        target.src = FALLBACK_PRODUCT_IMAGE;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-black/55 border border-[#E3C06A]/35 rounded px-2 py-1 text-xs text-[#E3C06A] flex items-center font-bold">
                      <Star size={12} className="mr-1 fill-[#E3C06A]" />
                      {item.rating.toFixed(1)}
                    </div>
                    {item.alcohol && (
                      <div className="absolute bottom-3 left-3 text-xs uppercase tracking-widest bg-[#E3C06A] text-black px-2 py-1 rounded font-bold">
                        {item.alcohol}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-xs text-[#E3C06A] uppercase tracking-widest font-semibold mb-2">{item.category}</p>
                    <h3 className="text-3xl font-bold text-white leading-tight mb-3">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-4 min-h-[40px]">{item.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl font-serif text-white">{formatLkr(item.price)}</span>
                      {item.sizes && item.sizes.length > 0 && (
                        <span className="text-xs text-gray-400">{item.sizes.join(" / ")}</span>
                      )}
                    </div>

                    <button
                      onClick={() => addToCart(item, item.sizes?.[0])}
                      className="w-full bg-transparent hover:bg-white/5 border border-[#2c313f] text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={14} />
                      Add to Cart
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {filteredItems.length === 0 && (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-serif text-white mb-2">No products found</h2>
            <p className="text-gray-400">Try another search or category.</p>
          </div>
        )}
      </div>
    </div>
  );
};
