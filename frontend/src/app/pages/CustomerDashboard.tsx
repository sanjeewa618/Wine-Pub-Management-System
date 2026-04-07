import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { CalendarDays, Package, Settings, ArrowRight } from "lucide-react";
import { apiRequest } from "../services/api";

type Reservation = {
  _id: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  tableLabel?: string;
  tableLabels?: string[];
};

type Order = {
  _id: string;
  orderType: "pickup" | "delivery";
  status: string;
  total: number;
  createdAt: string;
};

function reservationTimestamp(item: Reservation) {
  return new Date(`${item.date}T${item.time}:00`).getTime();
}

function orderTimestamp(item: Order) {
  return new Date(item.createdAt).getTime();
}

export const CustomerDashboard = () => {
  const { state } = useApp();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadOverview = async () => {
      try {
        const [reservationsResponse, ordersResponse] = await Promise.all([
          apiRequest<{ reservations: Reservation[] }>("/reservations"),
          apiRequest<{ orders: Order[] }>("/orders"),
        ]);

        if (!isActive) {
          return;
        }

        const sortedReservations = [...(reservationsResponse.reservations || [])].sort(
          (a, b) => reservationTimestamp(b) - reservationTimestamp(a)
        );
        const sortedOrders = [...(ordersResponse.orders || [])].sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
        setReservations(sortedReservations);
        setOrders(sortedOrders);
      } catch {
        // Keep last successful dashboard snapshot if one poll fails.
      }
    };

    void loadOverview();
    const pollId = window.setInterval(() => {
      void loadOverview();
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(pollId);
    };
  }, []);

  const nextReservation = useMemo(
    () =>
      reservations
        .filter((item) => reservationTimestamp(item) >= Date.now() && item.status !== "cancelled")
        .sort((a, b) => reservationTimestamp(a) - reservationTimestamp(b))[0],
    [reservations]
  );

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6">
        <div className="flex items-center space-x-6">
          <div className="h-20 w-20 rounded-full bg-[#D4AF37] border-2 border-[#D4AF37] flex items-center justify-center text-3xl font-serif font-bold text-white shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            {state.user?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-serif text-white font-bold mb-1">{state.user?.name}</h1>
            <p className="text-[#D4AF37] font-medium tracking-wider text-sm uppercase">VinoVerse Member</p>
          </div>
        </div>
        <Link to="/customer/settings" className="mt-6 md:mt-0 bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors flex items-center">
          <Settings size={16} className="mr-2" /> Edit Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111] border border-[#333] p-6 md:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white font-bold flex items-center">
              <CalendarDays className="mr-3 text-[#D4AF37]" size={24} /> My Reservations
            </h2>
            <Link to="/customer/reservations" className="text-sm text-gray-400 hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">View All <ArrowRight size={14} /></Link>
          </div>

          {nextReservation ? (
            <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Next Reservation</p>
              <p className="text-lg font-semibold text-white">{new Date(`${nextReservation.date}T${nextReservation.time}:00`).toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-1">
                Table(s): {nextReservation.tableLabels?.length ? nextReservation.tableLabels.join(", ") : nextReservation.tableLabel || "Not assigned"}
              </p>
              <p className="text-xs text-[#D4AF37] mt-2 uppercase tracking-wider font-semibold">Status: {nextReservation.status}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#333] bg-[#1a1a1a] p-5 text-sm text-gray-400">No upcoming reservations.</div>
          )}
        </div>

        <div className="bg-[#111] border border-[#333] p-6 md:p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif text-white font-bold flex items-center">
              <Package className="mr-3 text-[#D4AF37]" size={24} /> Recent Order Activities
            </h2>
            <Link to="/customer/orders" className="text-sm text-gray-400 hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1">View All <ArrowRight size={14} /></Link>
          </div>
          {recentOrders.length ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order._id} className="rounded-xl border border-[#333] bg-[#1a1a1a] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white uppercase tracking-wider">{order.orderType}</p>
                    <p className="text-sm text-[#D4AF37] font-semibold">LKR {Number(order.total || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-300 mt-2 uppercase tracking-wider">Status: {order.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#333] bg-[#1a1a1a] p-5 text-sm text-gray-400">No recent orders.</div>
          )}
        </div>
      </div>
    </div>
  );
};

