import React from "react";
import { useApp } from "../context/AppContext";
import { Package, TrendingUp, DollarSign, Star, Wine, Box } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SellerDashboard = () => {
  const { state } = useApp();

  const data = [
    { name: 'Red', sales: 4000 },
    { name: 'White', sales: 3000 },
    { name: 'Sparkling', sales: 2000 },
    { name: 'Rosé', sales: 2780 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">Seller Dashboard</h1>
          <p className="text-gray-400">Manage your premium wine inventory and track sales.</p>
        </div>
        <button className="mt-4 md:mt-0 bg-[#D4AF37] text-black px-6 py-2 rounded font-bold uppercase tracking-wider text-sm hover:bg-[#b5952f] transition-colors flex items-center">
          <Wine size={16} className="mr-2" /> Add New Wine
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Sales", value: "$12,450", change: "+8.2%", icon: <DollarSign size={24} />, color: "text-green-400" },
          { title: "Wines Listed", value: "24", change: "+2", icon: <Wine size={24} />, color: "text-[#D4AF37]" },
          { title: "Bottles Sold", value: "156", change: "+12.5%", icon: <Package size={24} />, color: "text-[#D4AF37]" },
          { title: "Average Rating", value: "4.8", change: "+0.1", icon: <Star size={24} />, color: "text-[#D4AF37]" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#111] border border-[#333] p-6 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-6">Sales by Category</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#666'}} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#666'}} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                  cursor={{fill: '#1a1a1a'}}
                />
                <Bar dataKey="sales" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111] border border-[#333] p-6 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Top Selling Wines</h3>
          <div className="flex-1 space-y-4">
            {[
              { name: "Château Margaux 2015", sold: 42, stock: 15, img: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=100" },
              { name: "Dom Pérignon Vintage 2012", sold: 38, stock: 8, img: "https://images.unsplash.com/photo-1590664216390-50fb3d63bd18?auto=format&fit=crop&q=80&w=100" },
              { name: "Opus One 2018", sold: 25, stock: 4, img: "https://images.unsplash.com/photo-1606115915130-4507a4f92bc5?auto=format&fit=crop&q=80&w=100" },
            ].map((wine, i) => (
              <div key={i} className="flex items-center bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                <img src={wine.img} alt={wine.name} className="w-12 h-12 rounded object-cover mr-4" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{wine.name}</h4>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-400">{wine.sold} sold</span>
                    <span className={wine.stock < 10 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{wine.stock} left</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 bg-[#1a1a1a] border border-[#333] text-white py-3 rounded text-sm hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors">
            View All Inventory
          </button>
        </div>
      </div>
    </div>
  );
};
