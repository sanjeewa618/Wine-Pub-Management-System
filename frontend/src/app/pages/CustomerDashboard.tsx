import React from "react";
import { useApp } from "../context/AppContext";
import { CalendarDays, Package, MapPin, Settings, User } from "lucide-react";

export const CustomerDashboard = () => {
  const { state } = useApp();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div className="flex items-center space-x-6">
          <div className="h-20 w-20 rounded-full bg-[#D4AF37] border-2 border-[#D4AF37] flex items-center justify-center text-3xl font-serif font-bold text-white shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            {state.user?.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-serif text-white font-bold mb-1">{state.user?.name}</h1>
            <p className="text-[#D4AF37] font-medium tracking-wider text-sm uppercase">VinoVerse Member</p>
          </div>
        </div>
        <button className="mt-6 md:mt-0 bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors flex items-center">
          <Settings size={16} className="mr-2" /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reservations */}
        <div className="bg-[#111] border border-[#333] p-6 md:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white font-bold flex items-center">
              <CalendarDays className="mr-3 text-[#D4AF37]" size={24} /> My Reservations
            </h2>
            <button className="text-sm text-gray-400 hover:text-[#D4AF37] transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between hover:border-[#D4AF37]/30 transition-colors">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="bg-[#D4AF37] text-white text-[10px] font-bold uppercase px-2 py-1 rounded">Confirmed</span>
                  <span className="text-sm text-gray-400 font-mono">Ref: VN-8429X</span>
                </div>
                <h3 className="text-lg font-bold text-white">Table for 2 Guests</h3>
                <p className="text-gray-400 text-sm">Tomorrow â€¢ 19:30 PM</p>
              </div>
              <button className="w-full sm:w-auto bg-[#333] text-white px-4 py-2 rounded text-sm hover:bg-[#444] transition-colors">
                Modify
              </button>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between opacity-60">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-1">
                  <span className="bg-[#333] text-gray-400 text-[10px] font-bold uppercase px-2 py-1 rounded">Completed</span>
                  <span className="text-sm text-gray-400 font-mono">Ref: VN-7102M</span>
                </div>
                <h3 className="text-lg font-bold text-white">Table for 4 Guests</h3>
                <p className="text-gray-400 text-sm">Oct 12, 2023 â€¢ 20:00 PM</p>
              </div>
              <button className="w-full sm:w-auto border border-[#333] text-gray-400 px-4 py-2 rounded text-sm hover:text-white transition-colors">
                Review
              </button>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-[#111] border border-[#333] p-6 md:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white font-bold flex items-center">
              <Package className="mr-3 text-[#D4AF37]" size={24} /> Recent Orders
            </h2>
            <button className="text-sm text-gray-400 hover:text-[#D4AF37] transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="bg-green-900/50 text-green-400 border border-green-800 text-[10px] font-bold uppercase px-2 py-1 rounded">Delivered</span>
                    <span className="text-sm text-gray-400 font-mono">#ORD-9021</span>
                  </div>
                  <p className="text-gray-400 text-sm">Oct 15, 2023</p>
                </div>
                <span className="font-serif text-[#D4AF37] text-lg">$344.00</span>
              </div>
              <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-[#333]">
                <img src="https://images.unsplash.com/photo-1590664216390-50fb3d63bd18?auto=format&fit=crop&q=80&w=100" alt="Wine" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Dom PÃ©rignon Vintage 2012</p>
                  <p className="text-xs text-gray-500">Qty: 1 â€¢ Size: 750ml</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-[#333]">
                <img src="https://images.unsplash.com/photo-1569914442111-c91838637775?auto=format&fit=crop&q=80&w=100" alt="Wine" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Cloudy Bay Sauvignon Blanc</p>
                  <p className="text-xs text-gray-500">Qty: 1 â€¢ Size: 750ml</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-[#111] border border-[#333] p-6 md:p-8 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white font-bold flex items-center">
              <MapPin className="mr-3 text-[#D4AF37]" size={24} /> Delivery Addresses
            </h2>
            <button className="text-sm text-[#D4AF37] hover:text-white transition-colors font-bold">+ Add New</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-[#D4AF37] p-5 rounded-xl relative">
              <div className="absolute top-4 right-4 bg-[#D4AF37] text-white text-[10px] font-bold uppercase px-2 py-1 rounded">Default</div>
              <h3 className="text-white font-bold mb-2">Home</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {state.user?.name}<br />
                123 Luxury Apartment Bldg<br />
                Suite 4B, Park Avenue<br />
                New York, NY 10022
              </p>
              <div className="flex space-x-3 mt-4">
                <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold">Edit</button>
                <button className="text-xs text-red-400 hover:text-red-300 uppercase tracking-wider font-bold">Delete</button>
              </div>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl hover:border-[#D4AF37]/30 transition-colors">
              <h3 className="text-white font-bold mb-2">Office</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {state.user?.name}<br />
                TechTower Innovations<br />
                Floor 12, Financial District<br />
                New York, NY 10005
              </p>
              <div className="flex space-x-3 mt-4">
                <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold">Edit</button>
                <button className="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold">Set Default</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

