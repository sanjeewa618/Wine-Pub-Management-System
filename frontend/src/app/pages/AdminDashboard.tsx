import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { Users, Wine, CalendarDays, DollarSign, TrendingUp, Package, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiRequest } from "../services/api";

interface Order {
  _id: string;
  orderNumber?: string;
  total: number;
  totalPrice?: number;
  createdAt: string;
  status?: string;
}

interface StatCard {
  title: string;
  value: number | string;
  change?: string;
  icon: React.ReactNode;
  color: string;
  path: string;
}

export const AdminDashboard = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeReservations: 0,
    totalOrders: 0,
    registeredUsers: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch users count - API returns { success: true, users }
      const usersResponse = await apiRequest<any>("/users", { method: "GET" });
      const users = usersResponse?.users || [];
      const usersCount = Array.isArray(users)
        ? users.filter((user: any) => String(user?.role || "").toLowerCase() === "customer").length
        : 0;

      // Fetch reservations - API returns { success: true, reservations }
      const reservationsResponse = await apiRequest<any>("/reservations", { method: "GET" });
      const reservations = reservationsResponse?.reservations || [];
      const activeReservations = Array.isArray(reservations)
        ? reservations.filter((r: any) => String(r.status || "").toLowerCase() === "confirmed").length
        : 0;

      // Fetch orders - API returns { success: true, orders }
      const ordersResponse = await apiRequest<any>("/orders", { method: "GET" });
      const orders = ordersResponse?.orders || [];
      const totalOrders = Array.isArray(orders) ? orders.length : 0;
      const totalRevenue = Array.isArray(orders) ? orders.reduce((sum: number, order: any) => {
        return sum + (order.total || order.totalPrice || 0);
      }, 0) : 0;

      setStats({
        totalRevenue,
        activeReservations,
        totalOrders,
        registeredUsers: usersCount,
      });

      // Build recent activities from real data
      const activities: any[] = [];
      
      // Add latest reservations
      const sortedReservations = (Array.isArray(reservations) ? [...reservations] : [])
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3);

      sortedReservations.forEach((res: any) => {
        activities.push({
          text: `New reservation for ${res.guests} (Table ${res.tableNumbers?.join(", ") || "N/A"})`,
          time: new Date(res.createdAt || new Date()).getTime(),
          icon: "calendar",
          type: "reservation",
        });
      });

      // Add latest orders
      const sortedOrders = (Array.isArray(orders) ? [...orders] : [])
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3);

      sortedOrders.forEach((order: any) => {
        const orderId = order._id?.slice(-4) || order.id?.slice(-4) || "????";
        activities.push({
          text: `Order #${orderId} confirmed - LKR ${(order.total || order.totalPrice || 0).toFixed(2)}`,
          time: new Date(order.createdAt || new Date()).getTime(),
          icon: "package",
          type: "order",
        });
      });

      // Sort by time descending
      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 5));

      // Generate chart data from real orders
      generateChartDataFromOrders(orders);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartDataFromOrders = (orders: any[]) => {
    const dailyData: { [key: string]: { revenue: number; count: number } } = {};
    const today = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyData[dateKey] = { revenue: 0, count: 0 };
    }

    // Aggregate orders by date
    if (Array.isArray(orders)) {
      orders.forEach((order: any) => {
        try {
          const orderDate = new Date(order.createdAt || new Date());
          const dateKey = orderDate.toISOString().split("T")[0];
          if (dailyData[dateKey]) {
            const orderAmount = order.total || order.totalPrice || 0;
            dailyData[dateKey].revenue += orderAmount;
            dailyData[dateKey].count += 1;
          }
        } catch (e) {
          console.error("Error processing order:", e);
        }
      });
    }

    // Convert to chart format
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chartDataPoints = Object.entries(dailyData).map(([date, data]) => {
      const d = new Date(date);
      return {
        name: dayNames[d.getDay()],
        revenue: Math.round(data.revenue),
        orders: data.count,
      };
    });

    setChartData(chartDataPoints);
  };

  const generateChartData = () => {
    // Will be called from fetchAdminData with real data
    // This ensures chart updates when data is fetched
  };

  const statCards: StatCard[] = [
    {
      title: "Total Revenue",
      value: `LKR ${stats.totalRevenue.toLocaleString()}`,
      icon: <DollarSign size={24} />,
      color: "text-green-400",
      path: "/admin/orders",
    },
    {
      title: "Active Reservations",
      value: stats.activeReservations,
      icon: <CalendarDays size={24} />,
      color: "text-[#E3C06A]",
      path: "/admin/reservations",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: <Package size={24} />,
      color: "text-[#E3C06A]",
      path: "/admin/orders",
    },
    {
      title: "Registered Customers",
      value: stats.registeredUsers,
      icon: <Users size={24} />,
      color: "text-[#E3C06A]",
      path: "/admin/users",
    },
  ];

  const getTimeAgo = (timestamp: number) => {
    const now = new Date().getTime();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "reservation":
        return <CalendarDays size={16} className="text-[#E3C06A]" />;
      case "order":
        return <Package size={16} className="text-green-400" />;
      case "seller":
        return <ShieldCheck size={16} className="text-blue-400" />;
      case "stock":
        return <Wine size={16} className="text-red-400" />;
      case "payment":
        return <DollarSign size={16} className="text-green-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#E3C06A]"></div>
          <p className="mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">System Overview</h1>
          <p className="text-gray-400">Welcome back, {state.user?.name}. Here's what's happening today.</p>
        </div>
        <button 
          onClick={fetchAdminData}
          className="bg-[#E3C06A] text-black px-4 py-2 rounded text-sm font-bold hover:bg-[#CDA74C] transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            onClick={() => navigate(stat.path)}
            className="bg-[#111] border border-[#333] p-6 rounded-xl hover:border-[#E3C06A]/50 transition-all cursor-pointer transform hover:scale-105"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 bg-[#1a1a1a] rounded-lg ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{stat.title}</h3>
            <p className="text-3xl font-serif text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#111] border border-[#333] p-6 rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Revenue Analytics (Last 7 Days)</h3>
            <button
              onClick={() => navigate("/admin/analytics")}
              className="inline-flex items-center gap-2 text-[#E3C06A] hover:text-white text-sm font-semibold transition-colors"
            >
              See More <ArrowRight size={16} />
            </button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E3C06A" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#E3C06A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#666'}} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#666'}} axisLine={false} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#E3C06A" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {recentActivities.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activities</p>
              </div>
            ) : (
              recentActivities.map((activity, i) => (
                <div key={i} className="flex items-start">
                  <div className="mt-1 mr-4 bg-[#1a1a1a] p-2 rounded-full border border-[#333]">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{getTimeAgo(activity.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

