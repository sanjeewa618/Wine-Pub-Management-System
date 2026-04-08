import React, { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, DollarSign, PackageCheck, RefreshCw, Star } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "../services/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#E3C06A",
  confirmed: "#CDA74C",
  preparing: "#B98F3A",
  ready: "#10b981",
  delivered: "#22c55e",
  cancelled: "#7f1d1d",
};

const PIE_COLORS = ["#E3C06A", "#CDA74C", "#B98F3A", "#8F6B1F", "#7f1d1d", "#3f3f46"];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function startOfWeek(input: Date) {
  const date = new Date(input);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(startDate: Date) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  )}`;
}

export const SellerAnalyticsPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerItems, setSellerItems] = useState<any[]>([]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ordersResponse, sellerProductsResponse] = await Promise.all([
        apiRequest<{ orders?: any[] }>("/orders"),
        apiRequest<{ items?: any[] }>("/seller-products"),
      ]);

      setOrders(ordersResponse.orders || []);
      setSellerItems(sellerProductsResponse.items || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load seller analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();

    const timer = window.setInterval(() => {
      void loadAnalytics();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const nonCancelled = orders.filter((order) => String(order.status || "").toLowerCase() !== "cancelled");
    const delivered = orders.filter((order) => String(order.status || "").toLowerCase() === "delivered");

    const totalRevenue = nonCancelled.reduce((sum, order) => sum + Number(order.sellerTotal || 0), 0);
    const totalOrders = orders.length;
    const deliveredRate = totalOrders > 0 ? (delivered.length / totalOrders) * 100 : 0;

    const averageRating =
      sellerItems.length > 0
        ? sellerItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / sellerItems.length
        : 0;

    return {
      totalRevenue,
      totalOrders,
      deliveredRate,
      averageRating,
    };
  }, [orders, sellerItems]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    const today = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      map.set(key, { revenue: 0, orders: 0 });
    }

    orders.forEach((order) => {
      const createdAt = new Date(order.createdAt || order.updatedAt || Date.now());
      const key = formatDateKey(createdAt);
      if (!map.has(key)) {
        return;
      }
      const current = map.get(key)!;
      if (String(order.status || "").toLowerCase() !== "cancelled") {
        current.revenue += Number(order.sellerTotal || 0);
      }
      current.orders += 1;
    });

    return Array.from(map.entries()).map(([key, value]) => {
      const dayDate = new Date(key);
      return {
        day: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: Math.round(value.revenue),
        orders: value.orders,
      };
    });
  }, [orders]);

  const weeklyTrend = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; orders: number }>();
    const currentWeekStart = startOfWeek(new Date());

    for (let i = 7; i >= 0; i -= 1) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() - i * 7);
      const key = formatDateKey(weekStart);
      map.set(key, { label: formatWeekLabel(weekStart), revenue: 0, orders: 0 });
    }

    orders.forEach((order) => {
      const createdAt = new Date(order.createdAt || order.updatedAt || Date.now());
      const weekStart = startOfWeek(createdAt);
      const key = formatDateKey(weekStart);
      if (!map.has(key)) {
        return;
      }
      const current = map.get(key)!;
      if (String(order.status || "").toLowerCase() !== "cancelled") {
        current.revenue += Number(order.sellerTotal || 0);
      }
      current.orders += 1;
    });

    return Array.from(map.values()).map((entry) => ({
      week: entry.label,
      revenue: Math.round(entry.revenue),
      orders: entry.orders,
    }));
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const statusMap = new Map<string, number>();
    orders.forEach((order) => {
      const status = String(order.status || "pending").toLowerCase();
      statusMap.set(status, Number(statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([name, value], index) => ({
      name,
      value,
      color: STATUS_COLORS[name] || PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [orders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Seller Analytics</h1>
          <p className="mt-2 text-sm text-gray-400">Daily and weekly performance insights powered by your real order history.</p>
        </div>
        <button
          onClick={() => void loadAnalytics()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:border-[#E3C06A] hover:text-[#E3C06A] md:mt-0"
        >
          <RefreshCw size={14} /> Refresh Analytics
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Revenue",
            value: `LKR ${Math.round(metrics.totalRevenue).toLocaleString()}`,
            icon: <DollarSign size={20} />,
            color: "text-emerald-300",
          },
          {
            label: "Total Orders",
            value: String(metrics.totalOrders),
            icon: <PackageCheck size={20} />,
            color: "text-[#E3C06A]",
          },
          {
            label: "Average Rating",
            value: metrics.averageRating.toFixed(2),
            icon: <Star size={20} />,
            color: "text-[#CDA74C]",
          },
          {
            label: "Delivered Rate",
            value: `${metrics.deliveredRate.toFixed(1)}%`,
            icon: <Activity size={20} />,
            color: "text-sky-300",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#333] bg-[#111] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className={`rounded-lg bg-[#1a1a1a] p-2 ${card.color}`}>{card.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {isLoading ? "updating" : "live"}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
            <p className="mt-1 text-2xl font-serif text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-[#3a3220] bg-[#111] p-5">
          <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold text-white">
            <CalendarDays size={18} className="text-[#E3C06A]" /> Daily Trend (Last 7 Days)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid stroke="#2f2615" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#121212", borderColor: "#3a3220", color: "#fff" }}
                  formatter={(value: number, name: string) => [name === "revenue" ? `LKR ${value.toLocaleString()}` : value, name]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#E3C06A" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#CDA74C" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-[#3a3220] bg-[#111] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Order Status Breakdown</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  label
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#121212", borderColor: "#3a3220", color: "#fff" }} />
                <Legend formatter={(value) => String(value).toUpperCase()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#3a3220] bg-[#111] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Weekly Revenue Pattern (Last 8 Weeks)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="weeklyRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E3C06A" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#E3C06A" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2f2615" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="week" hide />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#121212", borderColor: "#3a3a3a", color: "#fff" }}
                  formatter={(value: number, name: string) => [name === "revenue" ? `LKR ${value.toLocaleString()}` : value, name]}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.week || "")}
                />
                <Area type="monotone" dataKey="revenue" stroke="#E3C06A" fill="url(#weeklyRevenue)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="orders" stroke="#CDA74C" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
    </div>
  );
};
