import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

type SellerOrderAlert = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  metadata?: {
    orderId?: string;
    trackingNumber?: string;
    paymentMethod?: string;
    adminName?: string;
    adminEmail?: string;
    orderType?: string;
    items?: Array<{
      productId?: string;
      name?: string;
      quantity?: number;
      price?: number;
    }>;
  };
};

const formatPaymentMethod = (value?: string) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "cash") return "Cash on Delivery";
  if (normalized === "card") return "Prepayment";
  return value || "N/A";
};

export const SellerOrdersPage = () => {
  const [alerts, setAlerts] = useState<SellerOrderAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAlerts = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiRequest<{ alerts?: SellerOrderAlert[] }>("/notifications/seller-orders");
      setAlerts(response.alerts || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load order alerts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();

    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#333] pb-6 gap-3">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">Seller Order Alerts</h1>
          <p className="text-gray-400">New orders assigned by admin with payment method and item list.</p>
        </div>
        <button
          onClick={() => void loadAlerts()}
          className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
        >
          Refresh Alerts
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {isLoading && alerts.length === 0 ? (
          <p className="text-sm text-gray-400">Loading seller order alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-[#333] bg-[#111] p-6 text-sm text-gray-400">
            No seller order alerts found yet.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert._id} className="rounded-xl border border-[#333] bg-[#111] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                <h2 className="text-base md:text-lg font-semibold text-white">{alert.title}</h2>
                <span className="text-xs text-[#D4AF37]">{new Date(alert.createdAt).toLocaleString()}</span>
              </div>

              <p className="text-sm text-gray-300 mb-3">{alert.message}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Tracking Number</p>
                  <p className="text-white font-semibold mt-1">{alert.metadata?.trackingNumber || "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Order Payment Method</p>
                  <p className="text-white font-semibold mt-1">{formatPaymentMethod(alert.metadata?.paymentMethod)}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Admin Name</p>
                  <p className="text-white font-semibold mt-1">{alert.metadata?.adminName || "Admin"}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Admin Email</p>
                  <p className="text-white font-semibold mt-1 break-all">{alert.metadata?.adminEmail || "N/A"}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Order Item List</p>
                {!alert.metadata?.items || alert.metadata.items.length === 0 ? (
                  <p className="text-xs text-gray-400">No item details available.</p>
                ) : (
                  <div className="space-y-2">
                    {alert.metadata.items.map((item, index) => (
                      <div key={`${alert._id}-${item.productId || index}`} className="flex items-center justify-between gap-2 rounded border border-[#2a2a2a] bg-[#111] px-3 py-2">
                        <p className="text-sm text-white">{item.name || "Item"}</p>
                        <p className="text-xs text-[#D4AF37]">Qty {Number(item.quantity || 0)} · LKR {Number(item.price || 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
