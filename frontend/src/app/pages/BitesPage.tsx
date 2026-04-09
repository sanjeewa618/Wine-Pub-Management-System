import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, ShoppingCart, Star } from "lucide-react";
import { useApp } from "../context/AppContext";

const formatLkr = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;
const ITEMS_PER_PAGE = 9;

export const BitesPage = () => {
  const { products, addToCart } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const headingRef = React.useRef<HTMLDivElement | null>(null);
  const bitesGridTopRef = React.useRef<HTMLDivElement | null>(null);

  const biteProducts = useMemo(() => products.filter((item) => item.type === "bite"), [products]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(biteProducts.map((item) => item.category || "Uncategorized")))], [biteProducts]);

  const filteredBites = useMemo(() => {
    return biteProducts.filter((bite) => {
      const matchesSearch = bite.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === "All" || bite.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [biteProducts, searchTerm, category]);

  const totalPages = Math.max(1, Math.ceil(filteredBites.length / ITEMS_PER_PAGE));

  const paginatedBites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBites, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, category]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const changePage = (targetPage: number) => {
    const nextPage = Math.max(1, Math.min(totalPages, targetPage));
    setCurrentPage(nextPage);
    bitesGridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (biteProducts.length === 0) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9 }}
          className="container mx-auto text-center py-20"
        >
          <h1 className="text-5xl md:text-6xl font-serif text-white font-bold mb-4">Bites Menu</h1>
          <p className="text-gray-400">No bites found in database. Add a bite product in MongoDB and refresh.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto">
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.85 }}
          className="mb-10"
        >
          <h1 className="text-5xl md:text-6xl font-serif text-white font-bold mb-4">Bites Menu</h1>
          <p className="text-gray-300 max-w-4xl text-lg leading-relaxed">Discover handpicked bites crafted to pair perfectly with your favorite drinks.</p>
        </motion.div>

        <div className="mb-8 bg-[#111] border border-[#2c2c2c] rounded-2xl p-4 md:p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-[12px] uppercase tracking-wider text-[#E3C06A] font-bold mb-2">Category</p>
              <div className="relative">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-[#E3C06A]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative lg:col-span-2">
              <p className="text-[12px] uppercase tracking-wider text-[#E3C06A] font-bold mb-2">Search</p>
              <input
                type="text"
                placeholder="Search bites..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#E3C06A]"
              />
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>

        <div ref={bitesGridTopRef} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paginatedBites.map((bite, idx) => (
            <motion.div
              key={bite.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: idx * 0.04 }}
              className="bg-[#111] border border-[#222] rounded-xl overflow-hidden group hover:border-[#E3C06A]/50 transition-colors"
            >
              <div className="h-56 relative overflow-hidden bg-black">
                <img src={bite.image} alt={bite.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 right-4 bg-black/55 border border-[#E3C06A]/35 rounded px-2 py-1 text-xs text-[#E3C06A] flex items-center font-bold">
                  <Star size={12} className="mr-1 fill-[#E3C06A]" />
                  {bite.rating.toFixed(1)}
                </div>
                <div className="absolute bottom-4 left-4 text-xs uppercase tracking-widest bg-[#E3C06A] text-black px-2 py-1 rounded font-bold">
                  {bite.category}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold text-white leading-tight">{bite.name}</h3>
                  <span className="text-[#E3C06A] font-serif text-2xl">{formatLkr(bite.price)}</span>
                </div>

                {Array.isArray(bite.sizePricing) && bite.sizePricing.length > 0 && (
                  <div className="mb-4 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-sm text-gray-300 space-y-1">
                    {bite.sizePricing.map((entry) => (
                      <p key={`${bite.id}-${entry.size}`}>
                        <span className="text-[#E3C06A] font-semibold">{entry.size} Price:</span> {formatLkr(entry.price)}
                      </p>
                    ))}
                  </div>
                )}

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
        </div>

        {filteredBites.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBites.length)} of {filteredBites.length}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-md border border-[#2c313f] text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-[#E3C06A]/60 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  Prev
                </button>

                <span className="text-sm text-gray-300">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-md border border-[#2c313f] text-xs font-bold uppercase tracking-wider text-gray-200 hover:border-[#E3C06A]/60 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {filteredBites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.75 }}
            className="py-16 text-center"
          >
            <h2 className="text-2xl font-serif text-white mb-2">No bites found</h2>
            <p className="text-gray-400">Try another category or search text.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
