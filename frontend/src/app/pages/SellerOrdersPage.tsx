import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";

type SellerOrderAlert = {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead?: boolean;
  metadata?: {
    orderId?: string;
    trackingNumber?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    orderStatus?: string;
    adminName?: string;
    adminEmail?: string;
    orderType?: string;
    total?: number;
    subtotal?: number;
    tax?: number;
    deliveryCharge?: number;
    items?: Array<{
      productId?: string;
      name?: string;
      quantity?: number;
      price?: number;
      brand?: string;
      rating?: number;
      selectedSize?: string;
    }>;
    paymentReference?: string;
    receiptId?: string;
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
  const [isConfirmingOrderId, setIsConfirmingOrderId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const getAlertStatus = (alert: SellerOrderAlert) => String(alert.metadata?.orderStatus || "pending").toLowerCase();

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

  const handleConfirmOrder = async (alert: SellerOrderAlert) => {
    const orderId = alert.metadata?.orderId;
    if (!orderId) {
      setErrorMessage("Order reference is missing for this alert.");
      return;
    }

    setIsConfirmingOrderId(orderId);
    setErrorMessage("");

    try {
      await apiRequest(`/orders/${orderId}/confirm`, { method: "PUT" });
      setAlerts((prev) =>
        prev.map((entry) => {
          if (String(entry.metadata?.orderId || "") !== String(orderId)) {
            return entry;
          }

          return {
            ...entry,
            isRead: true,
            metadata: {
              ...(entry.metadata || {}),
              orderStatus: "confirmed",
            },
          };
        })
      );
      await loadAlerts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to confirm the order");
    } finally {
      setIsConfirmingOrderId(null);
    }
  };

  const handleViewReceipt = async (alert: SellerOrderAlert) => {
    const receiptId = alert.metadata?.receiptId;
    if (!receiptId) {
      setErrorMessage("Receipt details are not attached to this order yet.");
      return;
    }

    try {
      const response = await apiRequest<{ payment?: { reference?: string; amount?: number; paymentMethod?: string; status?: string; createdAt?: string; orderId?: { trackingNumber?: string; orderType?: string; total?: number } } }>(`/payments/${receiptId}`);
      const payment = response.payment;
      const receiptWindow = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");

      if (!receiptWindow || !payment) {
        throw new Error("Unable to open receipt view");
      }

      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${payment.reference || ""}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; background: #111; color: #fff; }
              .card { max-width: 640px; margin: 0 auto; border: 1px solid #333; border-radius: 16px; padding: 20px; background: #151515; }
              h1 { margin: 0 0 8px; font-size: 24px; }
              p { margin: 6px 0; color: #d1d5db; }
              .gold { color: #E3C06A; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1 class="gold">Payment Receipt</h1>
              <p><strong>Reference:</strong> ${payment.reference || "-"}</p>
              <p><strong>Date:</strong> ${payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "-"}</p>
              <p><strong>Amount:</strong> LKR ${Number(payment.amount || 0).toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${payment.paymentMethod || "-"}</p>
              <p><strong>Status:</strong> ${payment.status || "-"}</p>
              <p><strong>Order Tracking:</strong> ${payment.orderId?.trackingNumber || "-"}</p>
              <p><strong>Order Type:</strong> ${payment.orderId?.orderType || "-"}</p>
              <p><strong>Order Total:</strong> LKR ${Number(payment.orderId?.total || 0).toFixed(2)}</p>
            </div>
          </body>
        </html>
      `);
      receiptWindow.document.close();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load receipt");
    }
  };

  const formatCurrency = (value?: number) => `LKR ${Number(value || 0).toFixed(2)}`;

  const weeklyOrderChartData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    alerts.forEach((alert) => {
      const day = new Date(alert.createdAt).getDay();
      const mondayIndex = (day + 6) % 7;
      counts[mondayIndex] += 1;
    });

    return labels.map((label, index) => ({
      label,
      orders: counts[index],
    }));
  }, [alerts]);

  const recentOrderActivities = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .map((alert) => {
        const firstItem = alert.metadata?.items?.[0];
        const itemSummary = firstItem
          ? `${firstItem.name || "Item"}${firstItem.brand ? ` · ${firstItem.brand}` : ""} x${Number(firstItem.quantity || 0)}`
          : "No item details";

        return {
          id: alert._id,
          title: `${alert.metadata?.orderType || "seller-order"} · ${String(alert.metadata?.orderStatus || "pending")}`,
          detail: `${itemSummary} · ${formatPaymentMethod(alert.metadata?.paymentMethod)} · ${formatCurrency(alert.metadata?.total ?? alert.metadata?.subtotal)}`,
          time: new Date(alert.createdAt).getTime(),
        };
      });
  }, [alerts]);

  const pendingAlerts = useMemo(
    () => alerts.filter((alert) => getAlertStatus(alert) !== "confirmed"),
    [alerts]
  );

  const confirmedAlerts = useMemo(
    () => alerts.filter((alert) => getAlertStatus(alert) === "confirmed"),
    [alerts]
  );

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
          className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#E3C06A] hover:text-white hover:border-[#E3C06A]/60 transition-colors"
        >
          Refresh Alerts
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#333] bg-[#111] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Total Alerts</p>
          <p className="mt-2 text-3xl font-serif text-white">{alerts.length}</p>
        </div>
        <div className="rounded-xl border border-[#333] bg-[#111] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Pending Confirmations</p>
          <p className="mt-2 text-3xl font-serif text-white">{pendingAlerts.length}</p>
        </div>
        <div className="rounded-xl border border-[#333] bg-[#111] p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400">Confirmed</p>
          <p className="mt-2 text-3xl font-serif text-white">{confirmedAlerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">Weekly Orders Analysis</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyOrderChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sellerOrdersLineGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E3C06A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#E3C06A" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(212,175,55,0.08)" }}
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#E3C06A"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: "#E3C06A", fill: "#0f0f0f" }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#E3C06A", fill: "#E3C06A" }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="url(#sellerOrdersLineGlow)"
                  strokeWidth={10}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">Recent Order Activities</h2>
          <div
            className="space-y-3 max-h-[300px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#E3C06A]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#E3C06A]"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#E3C06A #1a1a1a" }}
          >
            {isLoading && recentOrderActivities.length === 0 ? (
              <p className="text-sm text-gray-400">Loading recent activities...</p>
            ) : recentOrderActivities.length === 0 ? (
              <p className="text-sm text-gray-400">No order activities found.</p>
            ) : (
              recentOrderActivities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                  <p className="text-sm text-white font-semibold">{activity.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.detail}</p>
                  <p className="text-xs text-[#E3C06A] mt-1">{new Date(activity.time).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Pending Alerts</h2>
          <span className="text-xs text-gray-400">Compact view with expandable details</span>
        </div>

        {isLoading && pendingAlerts.length === 0 ? (
          <p className="text-sm text-gray-400">Loading seller order alerts...</p>
        ) : pendingAlerts.length === 0 ? (
          <div className="rounded-xl border border-[#333] bg-[#111] p-6 text-sm text-gray-400">
            No pending alerts found.
          </div>
        ) : (
          pendingAlerts.map((alert) => {
            const orderStatus = getAlertStatus(alert);
            const isConfirmed = orderStatus === "confirmed";
            const total = alert.metadata?.total ?? alert.metadata?.subtotal ?? 0;
            const firstItem = alert.metadata?.items?.[0];
            const totalQty = (alert.metadata?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const isExpanded = expandedAlertId === alert._id;

            return (
            <div key={alert._id} className="rounded-xl border border-[#333] bg-[#111] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                <h2 className="text-base md:text-lg font-semibold text-white truncate">{alert.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${isConfirmed ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" : "text-[#E3C06A] border-[#E3C06A]/30 bg-[#E3C06A]/10"}`}>
                    {orderStatus}
                  </span>
                  <span className="text-xs text-[#E3C06A]">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-3">{alert.message}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Payment Type</p>
                  <p className="text-white font-semibold mt-1">{formatPaymentMethod(alert.metadata?.paymentMethod)}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Order Item</p>
                  <p className="text-white font-semibold mt-1 truncate">{firstItem?.name || "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Qty</p>
                  <p className="text-white font-semibold mt-1">{totalQty}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handleConfirmOrder(alert)}
                  disabled={isConfirmed || isConfirmingOrderId === alert.metadata?.orderId}
                  className="rounded-md border border-[#E3C06A]/45 bg-[#E3C06A]/10 px-4 py-2 text-xs font-bold text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirmingOrderId === alert.metadata?.orderId ? "Confirming..." : isConfirmed ? "Confirmed" : "Confirm Order"}
                </button>

                {alert.metadata?.paymentReference || alert.metadata?.receiptId ? (
                  <button
                    onClick={() => void handleViewReceipt(alert)}
                    className="rounded-md border border-[#2a2a2a] bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
                  >
                    View Receipt
                  </button>
                ) : null}

                <button
                  onClick={() => setExpandedAlertId((prev) => (prev === alert._id ? null : alert._id))}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
                >
                  {isExpanded ? "See Less" : "See More"}
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {isExpanded && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4 mt-4">
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Tracking Number</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.trackingNumber || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Order Total</p>
                      <p className="text-white font-semibold mt-1">{formatCurrency(total)}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Admin Name</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.adminName || "Admin"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Admin Email</p>
                      <p className="text-white font-semibold mt-1 break-all">{alert.metadata?.adminEmail || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Subtotal</p>
                      <p className="text-white font-semibold mt-1">{formatCurrency(alert.metadata?.subtotal)}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Payment Status</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.paymentStatus || "unpaid"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Order Item List</p>
                    {!alert.metadata?.items || alert.metadata.items.length === 0 ? (
                      <p className="text-xs text-gray-400">No item details available.</p>
                    ) : (
                      <div className="space-y-2">
                        {alert.metadata.items.map((item, index) => (
                          <div key={`${alert._id}-${item.productId || index}`} className="rounded border border-[#2a2a2a] bg-[#111] px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm text-white">{item.name || "Item"}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {item.brand ? `Brand: ${item.brand} · ` : ""}
                                  {item.selectedSize ? `Size: ${item.selectedSize} · ` : ""}
                                  {item.rating ? `Rating: ${Number(item.rating).toFixed(1)}` : ""}
                                </p>
                              </div>
                              <p className="text-xs text-[#E3C06A]">Qty {Number(item.quantity || 0)} · LKR {Number(item.price || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            );
          })
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Confirmed Alerts</h2>
          <span className="text-xs text-gray-400">Recently confirmed seller orders</span>
        </div>

        {isLoading && confirmedAlerts.length === 0 ? (
          <p className="text-sm text-gray-400">Loading confirmed alerts...</p>
        ) : confirmedAlerts.length === 0 ? (
          <div className="rounded-xl border border-[#333] bg-[#111] p-6 text-sm text-gray-400">
            No confirmed alerts found.
          </div>
        ) : (
          confirmedAlerts.map((alert) => {
            const orderStatus = getAlertStatus(alert);
            const isConfirmed = orderStatus === "confirmed";
            const total = alert.metadata?.total ?? alert.metadata?.subtotal ?? 0;
            const firstItem = alert.metadata?.items?.[0];
            const totalQty = (alert.metadata?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const isExpanded = expandedAlertId === alert._id;

            return (
            <div key={alert._id} className="rounded-xl border border-[#333] bg-[#111] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                <h2 className="text-base md:text-lg font-semibold text-white truncate">{alert.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${isConfirmed ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" : "text-[#E3C06A] border-[#E3C06A]/30 bg-[#E3C06A]/10"}`}>
                    {orderStatus}
                  </span>
                  <span className="text-xs text-[#E3C06A]">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-3">{alert.message}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Payment Type</p>
                  <p className="text-white font-semibold mt-1">{formatPaymentMethod(alert.metadata?.paymentMethod)}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Order Item</p>
                  <p className="text-white font-semibold mt-1 truncate">{firstItem?.name || "N/A"}</p>
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                  <p className="text-gray-400">Qty</p>
                  <p className="text-white font-semibold mt-1">{totalQty}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handleConfirmOrder(alert)}
                  disabled={isConfirmed || isConfirmingOrderId === alert.metadata?.orderId}
                  className="rounded-md border border-[#E3C06A]/45 bg-[#E3C06A]/10 px-4 py-2 text-xs font-bold text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirmingOrderId === alert.metadata?.orderId ? "Confirming..." : isConfirmed ? "Confirmed" : "Confirm Order"}
                </button>

                {alert.metadata?.paymentReference || alert.metadata?.receiptId ? (
                  <button
                    onClick={() => void handleViewReceipt(alert)}
                    className="rounded-md border border-[#2a2a2a] bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
                  >
                    View Receipt
                  </button>
                ) : null}

                <button
                  onClick={() => setExpandedAlertId((prev) => (prev === alert._id ? null : alert._id))}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#E3C06A]/60 transition-colors"
                >
                  {isExpanded ? "See Less" : "See More"}
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {isExpanded && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4 mt-4">
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Tracking Number</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.trackingNumber || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Order Total</p>
                      <p className="text-white font-semibold mt-1">{formatCurrency(total)}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Admin Name</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.adminName || "Admin"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Admin Email</p>
                      <p className="text-white font-semibold mt-1 break-all">{alert.metadata?.adminEmail || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Subtotal</p>
                      <p className="text-white font-semibold mt-1">{formatCurrency(alert.metadata?.subtotal)}</p>
                    </div>
                    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                      <p className="text-gray-400">Payment Status</p>
                      <p className="text-white font-semibold mt-1">{alert.metadata?.paymentStatus || "unpaid"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#161616] p-3">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Order Item List</p>
                    {!alert.metadata?.items || alert.metadata.items.length === 0 ? (
                      <p className="text-xs text-gray-400">No item details available.</p>
                    ) : (
                      <div className="space-y-2">
                        {alert.metadata.items.map((item, index) => (
                          <div key={`${alert._id}-${item.productId || index}`} className="rounded border border-[#2a2a2a] bg-[#111] px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm text-white">{item.name || "Item"}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {item.brand ? `Brand: ${item.brand} · ` : ""}
                                  {item.selectedSize ? `Size: ${item.selectedSize} · ` : ""}
                                  {item.rating ? `Rating: ${Number(item.rating).toFixed(1)}` : ""}
                                </p>
                              </div>
                              <p className="text-xs text-[#E3C06A]">Qty {Number(item.quantity || 0)} · LKR {Number(item.price || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
