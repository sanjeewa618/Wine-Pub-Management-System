import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateQuantity, removeFromCart } = useApp();
  const navigationState = (location.state as { orderType?: "pickup" | "delivery"; address?: string } | null) || null;
  const [orderType, setOrderType] = useState<"pickup" | "delivery">(navigationState?.orderType === "delivery" ? "delivery" : "pickup");
  const [address, setAddress] = useState(navigationState?.address || "");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const deliveryCharge = orderType === "delivery" ? 4.99 : 0;
  const total = subtotal + tax + deliveryCharge;
  const canCheckout = orderType === "pickup" || address.trim().length > 8;

  const handleCheckout = async () => {
    if (!canCheckout) {
      return;
    }
    setCheckoutMessage("");

    if (orderType === "pickup") {
      navigate("/checkout/pickup");
      return;
    }

    navigate("/checkout/delivery", { state: { address } });
  };

  if (state.cart.length === 0) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 flex flex-col items-center justify-center pt-20 px-4">
        <div className="h-24 w-24 bg-[#111] rounded-full flex items-center justify-center mb-6 border border-[#333]">
          <ShoppingBag size={40} className="text-[#D4AF37]" />
        </div>
        <h1 className="text-4xl font-serif text-white font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md text-center">
          Looks like you haven't added any premium wines or tasty bites to your cart yet.
        </p>
        <Link 
          to="/wines" 
          className="px-8 py-4 bg-[#D4AF37] text-black rounded-lg font-bold uppercase tracking-wider hover:bg-[#c39b22] transition-colors"
        >
          Explore Our Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl md:text-5xl font-serif text-white font-bold mb-12 border-b border-[#333] pb-6">Your Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {state.cart.map((item) => (
              <motion.div 
                key={`${item.id}-${item.selectedSize}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#111] border border-[#333] rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6 relative"
              >
                <div className="h-24 w-24 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-[#D4AF37] uppercase tracking-widest font-bold block mb-1">{item.category}</span>
                      <h3 className="text-xl font-bold text-white truncate">{item.name}</h3>
                    </div>
                    <span className="text-xl font-serif text-white hidden sm:block">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  
                  {item.selectedSize && (
                    <p className="text-sm text-gray-400 mb-4">Size: {item.selectedSize}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4 bg-[#1a1a1a] border border-[#333] rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                        className="h-8 w-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#333] hover:text-white transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                        className="h-8 w-8 rounded flex items-center justify-center text-gray-400 hover:bg-[#333] hover:text-white transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedSize)}
                      className="text-red-400 hover:text-red-300 transition-colors p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#111] border border-[#333] rounded-xl p-8 sticky top-32 shadow-2xl">
              <h2 className="text-2xl font-serif text-[#D4AF37] font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 border-b border-[#333] pb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (8%)</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{orderType === "delivery" ? "Delivery" : "Pickup"}</span>
                  <span className="text-white">${deliveryCharge.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-5 mb-7 border-b border-[#333] pb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#D4AF37] mb-2">Order Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrderType("pickup")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        orderType === "pickup"
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : "bg-transparent text-gray-300 border-[#3a3a3a] hover:border-[#D4AF37]/60"
                      }`}
                    >
                      Pub Pickup
                    </button>
                    <button
                      onClick={() => setOrderType("delivery")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        orderType === "delivery"
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : "bg-transparent text-gray-300 border-[#3a3a3a] hover:border-[#D4AF37]/60"
                      }`}
                    >
                      Home Delivery
                    </button>
                  </div>
                </div>

                {orderType === "delivery" && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#D4AF37] mb-2">Delivery Address</p>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full delivery address"
                      className="w-full min-h-[88px] bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-end mb-8">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-4xl font-serif text-[#D4AF37]">${total.toFixed(2)}</span>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="w-full bg-[#D4AF37] text-black py-5 rounded-lg font-bold uppercase tracking-wider hover:bg-[#c39b22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 group"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              {checkoutMessage && <div className="mt-4 text-sm text-red-300">{checkoutMessage}</div>}

              <div className="mt-6 text-center text-xs text-gray-500 leading-relaxed">
                Secure checkout enabled. Next step lets you choose payment flow based on pickup or home delivery.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
