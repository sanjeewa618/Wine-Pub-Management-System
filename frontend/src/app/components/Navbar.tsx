import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useApp } from "../context/AppContext";
import { Search, ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Settings } from "lucide-react";

export const Navbar = () => {
  const { state, logout } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalCartItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Wines", path: "/wines" },
    { name: "Bites", path: "/bites" },
    { name: "Reservations", path: "/reservations" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-black/80 backdrop-blur-md shadow-lg py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex flex-col">
          <span className="text-2xl font-serif text-[#E3C06A] font-bold tracking-wider flex items-center gap-2">
            ðŸ· VinoVerse
          </span>
          <span className="text-xs text-slate-300 uppercase tracking-widest hidden md:block">
            Sip. Reserve. Experience.
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              target="_self"
              className={`text-sm uppercase tracking-wider font-medium hover:text-[#E3C06A] transition-colors ${
                location.pathname === link.path ? "text-[#E3C06A]" : "text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden lg:flex items-center space-x-6">
          <button className="text-white hover:text-[#E3C06A] transition-colors">
            <Search size={20} />
          </button>
          
          <Link to="/cart" className="relative text-white hover:text-[#E3C06A] transition-colors">
            <ShoppingCart size={20} />
            {totalCartItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#E3C06A] text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </Link>

          {state.user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-white hover:text-[#E3C06A] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[#E3C06A] flex items-center justify-center text-sm font-bold border border-[#E3C06A]">
                  {state.user.name.charAt(0)}
                </div>
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-2 overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#333]">
                    <p className="text-sm font-semibold text-white truncate">{state.user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{state.user.role}</p>
                  </div>
                  <Link
                    to={`/${state.user.role}`}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-[#E3C06A] transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <LayoutDashboard size={16} className="mr-2" />
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-[#E3C06A] transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-[#333] transition-colors"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/auth?mode=login" className="text-white hover:text-[#E3C06A] text-sm uppercase tracking-wider font-medium transition-colors">
                Login
              </Link>
              <Link to="/auth?mode=register" className="bg-[#E3C06A] text-black px-4 py-2 rounded text-sm uppercase tracking-wider font-bold hover:bg-[#CDA74C] transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden text-white hover:text-[#E3C06A] transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-t border-[#333] py-4 px-4 shadow-xl">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                target="_self"
                className="text-white text-lg font-medium hover:text-[#E3C06A] transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="h-px w-full bg-[#333] my-2"></div>
            {state.user ? (
              <>
                <Link
                  to={`/${state.user.role}`}
                  className="text-white text-lg font-medium hover:text-[#E3C06A] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-red-400 text-lg font-medium text-left transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-4 pt-2">
                <Link
                  to="/auth?mode=login"
                  className="text-white text-center border border-white py-2 rounded text-lg font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="bg-[#E3C06A] text-black text-center py-2 rounded text-lg font-bold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

