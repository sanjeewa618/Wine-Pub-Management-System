import React from "react";
import { useApp } from "../context/AppContext";
import { Users, Wine, CalendarDays, DollarSign, TrendingUp, Package, Clock, ShieldCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const AdminDashboard = () => {
  const { state } = useApp();

  const data = [
    { name: 'Mon', revenue: 4000, orders: 24 },
    { name: 'Tue', revenue: 3000, orders: 18 },
    { name: 'Wed', revenue: 5000, orders: 35 },
    { name: 'Thu', revenue: 4500, orders: 28 },
    { name: 'Fri', revenue: 7000, orders: 50 },
    { name: 'Sat', revenue: 9000, orders: 75 },
    { name: 'Sun', revenue: 8500, orders: 68 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">System Overview</h1>
          <p className="text-gray-400">Welcome back, {state.user?.name}. Here's what's happening today.</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button className="bg-[#1a1a1a] border border-[#333] text-white px-4 py-2 rounded text-sm hover:border-[#D4AF37] transition-colors flex items-center">
            <Clock size={14} className="mr-2 text-[#D4AF37]" /> Last 7 Days
          </button>
          <button className="bg-[#D4AF37] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#b5952f] transition-colors">
            Download Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Revenue", value: "$41,000", change: "+12.5%", icon: <DollarSign size={24} />, color: "text-green-400" },
          { title: "Active Reservations", value: "142", change: "+5.2%", icon: <CalendarDays size={24} />, color: "text-[#D4AF37]" },
          { title: "Total Orders", value: "298", change: "+18.1%", icon: <Package size={24} />, color: "text-[#D4AF37]" },
          { title: "Registered Users", value: "3,240", change: "+2.4%", icon: <Users size={24} />, color: "text-[#D4AF37]" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111] border border-[#333] p-6 rounded-xl hover:border-[#D4AF37]/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 bg-[#1a1a1a] rounded-lg ${stat.color}`}>{stat.icon}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded bg-[#1a1a1a] border border-[#333] ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change}
              </span>
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
            <h3 className="text-lg font-bold text-white">Revenue Analytics</h3>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#D4AF37] mr-1"></div> Revenue</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#D4AF37] mr-1"></div> Orders</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#666'}} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#666'}} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="orders" stroke="#D4AF37" fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { text: "New reservation for 4 (Table 12)", time: "10 mins ago", icon: <CalendarDays size={16} className="text-[#D4AF37]" /> },
              { text: "Order #8421 confirmed", time: "25 mins ago", icon: <Package size={16} className="text-green-400" /> },
              { text: "New seller application: Chateau Vineyards", time: "1 hour ago", icon: <ShieldCheck size={16} className="text-blue-400" /> },
              { text: "Low stock alert: Dom PÃ©rignon 2012", time: "2 hours ago", icon: <Wine size={16} className="text-red-400" /> },
              { text: "Payment received $450.00", time: "3 hours ago", icon: <DollarSign size={16} className="text-green-400" /> },
            ].map((activity, i) => (
              <div key={i} className="flex items-start">
                <div className="mt-1 mr-4 bg-[#1a1a1a] p-2 rounded-full border border-[#333]">{activity.icon}</div>
                <div>
                  <p className="text-sm text-gray-200">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

