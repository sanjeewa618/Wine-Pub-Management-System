import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useApp } from "../context/AppContext";
import { 
  LayoutDashboard, 
  Wine, 
  Users, 
  UtensilsCrossed, 
  CalendarDays, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  X,
  Store,
  BarChart3,
  ArrowLeft
} from "lucide-react";

export const DashboardLayout = () => {
  const { state, logout } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!state.user) {
    return <div className="p-8 text-center text-white">Please login to access the dashboard.</div>;
  }

  const role = state.user.role;

  const getLinks = () => {
    switch (role) {
      case "admin":
        return [
          { name: "Overview", path: "/admin", icon: LayoutDashboard },
          { name: "Users", path: "/admin/users", icon: Users },
          { name: "Sellers", path: "/admin/sellers", icon: Store },
          { name: "Reservations", path: "/admin/reservations", icon: CalendarDays },
          { name: "Wines", path: "/admin/wines", icon: Wine },
          { name: "Bites Menu", path: "/admin/bites", icon: UtensilsCrossed },
          { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
          { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
          { name: "Settings", path: "/admin/settings", icon: Settings },
        ];
      case "seller":
        return [
          { name: "Overview", path: "/seller", icon: LayoutDashboard },
          { name: "My Wines", path: "/seller/wines", icon: Wine },
          { name: "Orders", path: "/seller/orders", icon: ShoppingCart },
          { name: "Analytics", path: "/seller/analytics", icon: BarChart3 },
          { name: "Settings", path: "/seller/settings", icon: Settings },
        ];
      case "customer":
        return [
          { name: "My Profile", path: "/customer", icon: LayoutDashboard },
          { name: "My Reservations", path: "/customer/reservations", icon: CalendarDays },
          { name: "Order History", path: "/customer/orders", icon: ShoppingCart },
          { name: "Settings", path: "/customer/settings", icon: Settings },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-[#111] border-r border-[#333] transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between border-b border-[#333]">
          <Link to="/" className="text-xl font-serif text-[#D4AF37] font-bold tracking-wider">
            🍷 VinoVerse
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-[#333]">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center font-bold text-black">
              {state.user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold truncate">{state.user.name}</p>
              <p className="text-xs text-gray-400 capitalize">{role} Account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-[#D4AF37] text-black" 
                    : "text-gray-400 hover:bg-[#222] hover:text-white"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 text-[#D4AF37] hover:bg-[#222] w-full px-4 py-3 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#111] border-b border-[#333] flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-serif text-[#D4AF37] font-bold tracking-wider">🍷 VinoVerse</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-[#0a0a0a] to-[#1a1012]">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
