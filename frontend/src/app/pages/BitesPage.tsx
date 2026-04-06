import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, ShoppingCart, Star } from "lucide-react";
import { useApp } from "../context/AppContext";

const formatLkr = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;

export const BitesPage = () => {
  const { products, addToCart } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");

  const biteProducts = useMemo(() => products.filter((item) => item.type === "bite"), [products]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(biteProducts.map((item) => item.category || "Uncategorized")))], [biteProducts]);

  const filteredBites = useMemo(() => {
    return biteProducts.filter((bite) => {
      const matchesSearch = bite.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === "All" || bite.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [biteProducts, searchTerm, category]);

  if (biteProducts.length === 0) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
        <div className="container mx-auto text-center py-20">
          <h1 className="text-5xl md:text-6xl font-serif text-white font-bold mb-4">Bites Menu</h1>
          <p className="text-gray-400">No bites found in database. Add a bite product in MongoDB and refresh.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-serif text-white font-bold mb-4">Bites Menu</h1>
          <p className="text-gray-300 max-w-4xl text-lg leading-relaxed">Items are loaded directly from your MongoDB backend.</p>
        </div>

        <div className="mb-8 bg-[#111] border border-[#2c2c2c] rounded-2xl p-4 md:p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative lg:col-span-2">
              <input
                type="text"
                placeholder="Search bites..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              />
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>

            <div className="relative">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-[#D4AF37]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
          {filteredBites.map((bite) => (
            <motion.div
              key={bite.id}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="bg-[#111] border border-[#222] rounded-xl overflow-hidden group hover:border-[#D4AF37]/50 transition-colors"
            >
              <div className="h-56 relative overflow-hidden bg-black">
                <img src={bite.image} alt={bite.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 right-4 bg-black/55 border border-[#D4AF37]/35 rounded px-2 py-1 text-xs text-[#D4AF37] flex items-center font-bold">
                  <Star size={12} className="mr-1 fill-[#D4AF37]" />
                  {bite.rating.toFixed(1)}
                </div>
                <div className="absolute bottom-4 left-4 text-xs uppercase tracking-widest bg-[#D4AF37] text-black px-2 py-1 rounded font-bold">
                  {bite.category}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold text-white leading-tight">{bite.name}</h3>
                  <span className="text-[#D4AF37] font-serif text-2xl">{formatLkr(bite.price)}</span>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-5 min-h-[44px]">{bite.description}</p>

                <button
                  onClick={() => addToCart(bite)}
                  className="w-full bg-transparent hover:bg-white/5 border border-[#2c313f] text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={14} />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredBites.length === 0 && (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-serif text-white mb-2">No bites found</h2>
            <p className="text-gray-400">Try another category or search text.</p>
          </div>
        )}
      </div>
    </div>
  );
};
