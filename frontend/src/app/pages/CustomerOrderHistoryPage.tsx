import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Package, Store, Truck } from "lucide-react";
import { apiRequest } from "../services/api";

type OrderItem = {
  name: string;
  quantity: number;
  selectedSize?: string;
  image?: string;
  price: number;
};

type Order = {
  _id: string;
  orderType: "pickup" | "delivery";
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  paymentMethod?: "card" | "cash" | "other";
  paymentStatus: "unpaid" | "paid";
  total: number;
  items: OrderItem[];
  createdAt: string;
  deliveryAddress?: {
    addressLine?: string;
    city?: string;
    province?: string;
    notes?: string;
  };
};

function orderDateTime(order: Order) {
  return new Date(order.createdAt);
}

function statusOptionClass(isActive: boolean) {
  if (isActive) {
    return "border-emerald-500/70 bg-emerald-700/10 text-emerald-300";
  }

  return "border-[#3b3b3b] bg-[#171717] text-gray-400";
}

export const CustomerOrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchOrders = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest<{ orders: Order[] }>("/orders");
        if (!isActive) {
          return;
        }

        const sorted = [...(response.orders ?? [])].sort((a, b) => orderDateTime(b).getTime() - orderDateTime(a).getTime());
        setOrders(sorted);
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load order history");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchOrders();
    const pollId = window.setInterval(() => {
      void fetchOrders();
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(pollId);
    };
  }, []);

  const deliveryOrders = useMemo(() => orders.filter((order) => order.orderType === "delivery"), [orders]);
  const pickupOrders = useMemo(() => orders.filter((order) => order.orderType === "pickup"), [orders]);

  const renderOrderCard = (order: Order) => (
    <div key={order._id} className="rounded-xl border border-[#333] bg-[#111] p-5">
      {(() => {
        const isPickup = order.orderType === "pickup";
        const isCod = order.orderType === "delivery" && order.paymentMethod === "cash";
        const isPaid = !isCod;

        return (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusOptionClass(isPaid)}`}>
              PAID
            </span>
            {!isPickup && (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusOptionClass(isCod)}`}>
                COD (CASH ON DELIVERY)
              </span>
            )}
          </div>
        );
      })()}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div />
        <p className="text-sm font-semibold text-[#D4AF37]">LKR {Number(order.total || 0).toFixed(2)}</p>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-sm text-gray-300">
        <p className="inline-flex items-center gap-2 text-gray-400"><CalendarClock size={14} /> {orderDateTime(order).toLocaleString()}</p>
        {order.orderType === "delivery" && (
          <p className="text-gray-400">
            Delivery to: {[order.deliveryAddress?.addressLine, order.deliveryAddress?.city, order.deliveryAddress?.province]
              .filter(Boolean)
              .join(", ") || "Address not provided"}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-[#2f2f2f] pt-4">
        {order.items?.map((item, index) => (
          <div key={`${order._id}-${index}`} className="flex items-center gap-3 rounded-lg border border-[#2f2f2f] bg-[#171717] p-3">
            <img
              src={
                item.image ||
                "https://images.unsplash.com/photo-1514361892635-eae31a3d0f1d?auto=format&fit=crop&q=80&w=300"
              }
              alt={item.name}
              className="h-12 w-12 rounded object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{item.name}</p>
              <p className="text-xs text-gray-400">
                Qty: {item.quantity}
                {item.selectedSize ? ` • Size: ${item.selectedSize}` : ""}
                {typeof item.price === "number" ? ` • LKR ${item.price.toFixed(2)}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#333] bg-[#111] p-6">
        <h1 className="text-3xl font-serif text-white">Order History</h1>
        <p className="mt-2 text-sm text-gray-400">Delivery and pub-pickup orders are separated and shown in local date/time.</p>
      </div>

      {loading && <div className="rounded-xl border border-[#333] bg-[#111] p-5 text-sm text-gray-300">Loading order history...</div>}
      {errorMessage && <div className="rounded-xl border border-red-500/40 bg-red-600/10 p-5 text-sm text-red-200">{errorMessage}</div>}

      {!loading && !errorMessage && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white"><Truck size={18} className="text-[#D4AF37]" /> Delivery Orders</h2>
            {deliveryOrders.length === 0 ? (
              <div className="rounded-xl border border-[#333] bg-[#111] p-5 text-sm text-gray-400">No delivery orders yet.</div>
            ) : (
              deliveryOrders.map(renderOrderCard)
            )}
          </section>

          <section className="space-y-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white"><Store size={18} className="text-[#D4AF37]" /> Pub Pickup Orders</h2>
            {pickupOrders.length === 0 ? (
              <div className="rounded-xl border border-[#333] bg-[#111] p-5 text-sm text-gray-400">No pickup orders yet.</div>
            ) : (
              pickupOrders.map(renderOrderCard)
            )}
          </section>
        </div>
      )}

      {!loading && !errorMessage && orders.length > 0 && (
        <div className="rounded-xl border border-[#333] bg-[#111] p-4 text-sm text-gray-400 inline-flex items-center gap-2">
          <Package size={16} className="text-[#D4AF37]" />
          Recent activity updates every 15 seconds.
        </div>
      )}
    </div>
  );
};
