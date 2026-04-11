import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { Package, DollarSign, Star, Wine, RefreshCw, Plus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest } from "../services/api";

export const SellerDashboard = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sellerItems, setSellerItems] = useState<any[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);

  const sellerId = String(state.user?.id || "");

  const loadSellerDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [sellerProductsResponse, ordersResponse] = await Promise.all([
        apiRequest<{ items?: any[] }>("/seller-products"),
        apiRequest<{ orders?: any[] }>("/orders"),
      ]);

      const ownedItems = (sellerProductsResponse.items || []).filter(
        (item) => String(item?.sellerId?._id || item?.sellerId || "") === sellerId
      );
      setSellerItems(ownedItems);
      setSellerOrders(ordersResponse.orders || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load seller overview");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!sellerId) {
      return;
    }

    void loadSellerDashboardData();

    const timer = window.setInterval(() => {
      void loadSellerDashboardData();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [sellerId]);

  const totalItems = sellerItems.length;

  const totalRevenue = useMemo(() => {
    return sellerOrders
      .filter((order) => String(order.status || "").toLowerCase() !== "cancelled")
      .reduce((sum, order) => sum + Number(order.sellerTotal || 0), 0);
  }, [sellerOrders]);

  const bottlesSold = useMemo(() => {
    const liquorTypes = new Set(["wine", "arrack", "whiskey", "whisky", "rum", "vodka", "beer"]);
    return sellerOrders.reduce((sum, order) => {
      const quantity = (order.items || []).reduce((itemSum: number, item: any) => {
        return liquorTypes.has(String(item.productType || "").toLowerCase())
          ? itemSum + Number(item.quantity || 0)
          : itemSum;
      }, 0);
      return sum + quantity;
    }, 0);
  }, [sellerOrders]);

  const averageRating = useMemo(() => {
    if (sellerItems.length === 0) {
      return 0;
    }
    const total = sellerItems.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return total / sellerItems.length;
  }, [sellerItems]);

  const weeklySalesByCategory = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const categories = new Set<string>();
    const dayBuckets = labels.map(() => new Map<string, number>());

    sellerOrders.forEach((order) => {
      const createdAt = new Date(order.createdAt).getTime();
      if (!Number.isFinite(createdAt) || createdAt < weekAgo) {
        return;
      }

      const day = new Date(order.createdAt).getDay();
      const mondayIndex = (day + 6) % 7;

      (order.items || []).forEach((item: any) => {
        const category = String(item.productType || "item").toLowerCase();
        const sale = Number(item.price || 0) * Number(item.quantity || 0);
        categories.add(category);
        const current = Number(dayBuckets[mondayIndex].get(category) || 0);
        dayBuckets[mondayIndex].set(category, current + sale);
      });
    });

    const categoryList = Array.from(categories).sort();

    return labels.map((label, index) => {
      const row: Record<string, string | number> = { label };

      categoryList.forEach((category) => {
        row[category] = Math.round(Number(dayBuckets[index].get(category) || 0));
      });

      return row;
    });
  }, [sellerOrders]);

  const topSellingItems = useMemo(() => {
    const salesMap = new Map<string, { name: string; sold: number }>();

    sellerOrders.forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const id = String(item?.productId?._id || item?.productId || item?.name || "");
        if (!id) {
          return;
        }

        const current = salesMap.get(id) || { name: String(item?.name || "Item"), sold: 0 };
        current.sold += Number(item.quantity || 0);
        salesMap.set(id, current);
      });
    });

    const stockByName = new Map(
      sellerItems.map((item) => [String(item.name || ""), Number(item.stock || 0)])
    );
    const imageByName = new Map(
      sellerItems.map((item) => [String(item.name || ""), String(item.image || "")])
    );

    return Array.from(salesMap.values())
      .map((entry) => ({
        name: entry.name,
        sold: entry.sold,
        stock: Number(stockByName.get(entry.name) || 0),
        img:
          imageByName.get(entry.name) ||
          "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&q=80&w=100",
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6);
  }, [sellerItems, sellerOrders]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">Seller Dashboard</h1>
          <p className="text-gray-400">Live overview of your items, sales, and top-selling products.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <button
            onClick={() => void loadSellerDashboardData()}
            className="bg-[#1a1a1a] border border-[#333] text-white px-4 py-2 rounded font-bold uppercase tracking-wider text-xs hover:border-[#E3C06A] hover:text-[#E3C06A] transition-colors inline-flex items-center"
          >
            <RefreshCw size={14} className="mr-2" /> Refresh
          </button>
          <button
            onClick={() => navigate("/seller/wines")}
            className="bg-[#E3C06A] text-black px-5 py-2 rounded font-bold uppercase tracking-wider text-xs hover:bg-[#CDA74C] transition-colors inline-flex items-center"
          >
            <Plus size={14} className="mr-2" /> Add New Item
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Items",
            value: String(totalItems),
            change: isLoading ? "Updating..." : "Live",
            icon: <Wine size={24} />,
            color: "text-[#E3C06A]",
          },
          {
            title: "Total Revenue",
            value: `LKR ${Math.round(totalRevenue).toLocaleString()}`,
            change: isLoading ? "Updating..." : "Live",
            icon: <DollarSign size={24} />,
            color: "text-green-400",
          },
          {
            title: "Bottles Sold",
            value: String(bottlesSold),
            change: isLoading ? "Updating..." : "Live",
            icon: <Package size={24} />,
            color: "text-[#E3C06A]",
          },
          {
            title: "Avg Rating",
            value: averageRating.toFixed(1),
            change: isLoading ? "Updating..." : "Live",
            icon: <Star size={24} />,
            color: "text-[#E3C06A]",
          },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111] border border-[#333] p-6 rounded-xl hover:border-[#E3C06A]/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 bg-[#1a1a1a] rounded-lg ${stat.color}`}>{stat.icon}</div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-[#1a1a1a] border border-[#333] text-[#E3C06A]">
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{stat.title}</h3>
            <p className="text-3xl font-serif text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#111] border border-[#333] p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-6">Total Weekly Sales (Category Wise)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklySalesByCategory}>
                <defs>
                  <linearGradient id="sellerCategorySalesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E3C06A" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#E3C06A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sellerCategorySalesFillSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CDA74C" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#CDA74C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="sellerCategorySalesFillTertiary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B6A2B" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#8B6A2B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: "#666" }} axisLine={false} />
                <YAxis stroke="#666" tick={{ fill: "#666" }} axisLine={false} tickFormatter={(value) => `LKR ${(Number(value) / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#fff" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value: any) => `LKR ${Number(value).toLocaleString()}`}
                  cursor={{ fill: "rgba(212,175,55,0.08)" }}
                />
                {Array.from(new Set(sellerOrders.flatMap((order) => (order.items || []).map((item: any) => String(item.productType || "item").toLowerCase()))))
                  .sort()
                  .map((category, index) => {
                    const fillId = index === 0 ? "url(#sellerCategorySalesFill)" : index === 1 ? "url(#sellerCategorySalesFillSecondary)" : "url(#sellerCategorySalesFillTertiary)";
                    const stroke = index === 0 ? "#E3C06A" : index === 1 ? "#CDA74C" : "#8B6A2B";
                    return (
                      <Area
                        key={category}
                        type="monotone"
                        dataKey={category}
                        name={category.toUpperCase()}
                        stroke={stroke}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={fillId}
                        stackId="1"
                        dot={{ r: 3, strokeWidth: 2, stroke, fill: "#0f0f0f" }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke, fill: stroke }}
                      />
                    );
                  })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Top Selling Items</h3>
          <div className="flex-1 space-y-4">
            {topSellingItems.length === 0 ? (
              <div className="rounded-lg border border-[#333] bg-[#1a1a1a] p-4 text-sm text-gray-400">
                No sales data yet for your items.
              </div>
            ) : (
              topSellingItems.map((item, i) => (
                <div key={`${item.name}-${i}`} className="flex items-center bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                  <img src={item.img} alt={item.name} className="w-12 h-12 rounded object-cover mr-4" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-400">{item.sold} sold</span>
                    <span className={item.stock < 10 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{item.stock} left</span>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
          <button
            onClick={() => navigate("/seller/wines")}
            className="w-full mt-6 bg-[#1a1a1a] border border-[#333] text-white py-3 rounded text-sm hover:border-[#E3C06A] hover:text-[#E3C06A] transition-colors"
          >
            View My Items
          </button>
        </div>
      </div>
    </div>
  );
};
