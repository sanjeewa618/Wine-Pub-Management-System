import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";

type AdminSection =
  | "users"
  | "sellers"
  | "reservations"
  | "wines"
  | "bites"
  | "orders"
  | "analytics"
  | "settings";

interface AdminSectionPageProps {
  section: AdminSection;
  title: string;
  subtitle: string;
}

interface PendingSeller {
  _id: string;
  name: string;
  email: string;
  status: string;
  createdAt?: string;
}

const sectionData: Record<
  AdminSection,
  {
    actionLabel: string;
    kpis: Array<{ label: string; value: string; delta: string }>;
    activityTitle: string;
    activity: string[];
    queueTitle: string;
    queue: Array<{ name: string; detail: string; status: "high" | "medium" | "low" }>;
  }
> = {
  users: {
    actionLabel: "Create User",
    kpis: [
      { label: "Total Accounts", value: "3,240", delta: "+2.4%" },
      { label: "Admins", value: "12", delta: "+1" },
      { label: "Blocked", value: "18", delta: "-4" },
    ],
    activityTitle: "Recent User Activity",
    activity: [
      "New customer account created: nethmi@email.com",
      "Password reset requested by admin account",
      "Two-factor authentication enabled for 14 users",
      "Suspicious login attempt blocked",
    ],
    queueTitle: "User Management Queue",
    queue: [
      { name: "Approve Admin Invite", detail: "pending for manager@vinov.com", status: "high" },
      { name: "Review Blocked Accounts", detail: "18 users flagged by risk engine", status: "medium" },
      { name: "Cleanup Dormant Users", detail: "accounts inactive for 180+ days", status: "low" },
    ],
  },
  sellers: {
    actionLabel: "Add Seller",
    kpis: [
      { label: "Active Sellers", value: "56", delta: "+6.1%" },
      { label: "Pending Approvals", value: "9", delta: "+3" },
      { label: "Compliance Alerts", value: "4", delta: "-2" },
    ],
    activityTitle: "Recent Seller Activity",
    activity: [
      "Chateau Noir submitted KYC documents",
      "Golden Vine account approved",
      "Seller payout processed for LKR 240,000",
      "License expiry reminder sent to 3 sellers",
    ],
    queueTitle: "Seller Review Queue",
    queue: [
      { name: "KYC Validation", detail: "9 seller profiles need verification", status: "high" },
      { name: "Contract Renewals", detail: "5 partner agreements end this month", status: "medium" },
      { name: "Catalog Optimization", detail: "suggested SKU cleanup for low movers", status: "low" },
    ],
  },
  reservations: {
    actionLabel: "Create Reservation",
    kpis: [
      { label: "Today Bookings", value: "142", delta: "+5.2%" },
      { label: "VIP Tables", value: "27", delta: "+3" },
      { label: "Cancellations", value: "11", delta: "-1" },
    ],
    activityTitle: "Recent Reservation Activity",
    activity: [
      "Table 12 upgraded to VIP package",
      "Weekend brunch slots reached 90%",
      "Auto-confirmation sent for 24 reservations",
      "No-show risk warning triggered for 2 bookings",
    ],
    queueTitle: "Reservation Queue",
    queue: [
      { name: "Waitlist Allocation", detail: "15 guests waiting for Saturday slots", status: "high" },
      { name: "Special Requests", detail: "8 dietary notes pending assignment", status: "medium" },
      { name: "Floor Plan Sync", detail: "verify table map for events", status: "low" },
    ],
  },
  wines: {
    actionLabel: "Add Wine",
    kpis: [
      { label: "Catalog Items", value: "512", delta: "+18" },
      { label: "Low Stock", value: "23", delta: "-5" },
      { label: "Premium Labels", value: "84", delta: "+4" },
    ],
    activityTitle: "Recent Wine Activity",
    activity: [
      "New Bordeaux 2016 batch added",
      "Price update applied to 11 SKUs",
      "Dom Perignon stock threshold reached",
      "Vintage filter tags refreshed",
    ],
    queueTitle: "Catalog Queue",
    queue: [
      { name: "Low Stock Reorder", detail: "23 wines below minimum threshold", status: "high" },
      { name: "Price Audit", detail: "quarterly price calibration pending", status: "medium" },
      { name: "Image Quality Review", detail: "14 items need better product photos", status: "low" },
    ],
  },
  bites: {
    actionLabel: "Add Bite Item",
    kpis: [
      { label: "Menu Items", value: "64", delta: "+7" },
      { label: "Out of Stock", value: "6", delta: "-2" },
      { label: "Top Pairings", value: "18", delta: "+5" },
    ],
    activityTitle: "Recent Bites Activity",
    activity: [
      "Cheese platter options expanded",
      "Truffle fries recipe version updated",
      "Pairing tags synced with red wines",
      "Kitchen prep alert cleared for tapas",
    ],
    queueTitle: "Bites Queue",
    queue: [
      { name: "Ingredient Availability", detail: "6 menu items need substitution", status: "high" },
      { name: "Pairing Validation", detail: "review 12 suggested pairings", status: "medium" },
      { name: "Photography Refresh", detail: "update visuals for 9 dishes", status: "low" },
    ],
  },
  orders: {
    actionLabel: "Create Order",
    kpis: [
      { label: "Open Orders", value: "298", delta: "+18.1%" },
      { label: "Avg Fulfillment", value: "18m", delta: "-2m" },
      { label: "Refund Requests", value: "5", delta: "-1" },
    ],
    activityTitle: "Recent Order Activity",
    activity: [
      "Order #8421 packed and dispatched",
      "Express order marked priority",
      "Card payment verified for #8458",
      "One refund request escalated",
    ],
    queueTitle: "Order Queue",
    queue: [
      { name: "Priority Dispatch", detail: "12 orders need immediate handling", status: "high" },
      { name: "Payment Reconciliation", detail: "7 transactions pending sync", status: "medium" },
      { name: "Delivery SLA Review", detail: "analyze delays across zones", status: "low" },
    ],
  },
  analytics: {
    actionLabel: "Generate Report",
    kpis: [
      { label: "Weekly Revenue", value: "$41,000", delta: "+12.5%" },
      { label: "Conversion Rate", value: "8.2%", delta: "+0.9%" },
      { label: "Avg Basket", value: "$138", delta: "+6.3%" },
    ],
    activityTitle: "Recent Analytics Events",
    activity: [
      "Traffic spike detected from campaign A",
      "Table reservation funnel optimized",
      "Customer retention cohort refreshed",
      "Anomaly alert resolved for payment drop",
    ],
    queueTitle: "Insights Queue",
    queue: [
      { name: "Campaign Attribution", detail: "map conversions to ad channels", status: "high" },
      { name: "Churn Segmentation", detail: "review at-risk customer clusters", status: "medium" },
      { name: "Dashboard Cleanup", detail: "archive deprecated widgets", status: "low" },
    ],
  },
  settings: {
    actionLabel: "Save Changes",
    kpis: [
      { label: "Active Integrations", value: "12", delta: "+2" },
      { label: "Security Policies", value: "9", delta: "stable" },
      { label: "Pending Updates", value: "3", delta: "-1" },
    ],
    activityTitle: "Recent Settings Activity",
    activity: [
      "Role permissions updated for managers",
      "Backup schedule changed to 6-hour interval",
      "SMTP credentials rotated successfully",
      "Session timeout policy tightened",
    ],
    queueTitle: "Configuration Queue",
    queue: [
      { name: "Security Hardening", detail: "apply MFA for privileged roles", status: "high" },
      { name: "Notification Matrix", detail: "review channel preferences", status: "medium" },
      { name: "Theme Cleanup", detail: "align color tokens across modules", status: "low" },
    ],
  },
};

const statusColorMap = {
  high: "text-red-300 border-red-400/30 bg-red-500/10",
  medium: "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10",
  low: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
};

export const AdminSectionPage = ({ section, title, subtitle }: AdminSectionPageProps) => {
  const data = sectionData[section];
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [isApprovingSellerId, setIsApprovingSellerId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const isSellersSection = section === "sellers";

  const loadPendingSellers = async () => {
    setIsLoadingSellers(true);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ queues?: { pendingSellers?: PendingSeller[] } }>("/admin/queues");
      setPendingSellers(response.queues?.pendingSellers ?? []);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load pending sellers");
    } finally {
      setIsLoadingSellers(false);
    }
  };

  useEffect(() => {
    if (!isSellersSection) {
      return;
    }

    void loadPendingSellers();
  }, [isSellersSection]);

  const handleApproveSeller = async (seller: PendingSeller) => {
    setIsApprovingSellerId(seller._id);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ message?: string }>(`/users/${seller._id}/approve-seller`, {
        method: "PUT",
      });

      setPendingSellers((prev) => prev.filter((item) => item._id !== seller._id));
      setFeedbackType("success");
      setFeedbackMessage(response.message || `${seller.name} approved successfully`);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to approve seller");
    } finally {
      setIsApprovingSellerId(null);
    }
  };

  const sellersKpis = useMemo(() => {
    if (!isSellersSection) {
      return data.kpis;
    }

    return [
      { label: "Pending Approvals", value: String(pendingSellers.length), delta: pendingSellers.length > 0 ? "needs review" : "up to date" },
      { label: "Ready To Approve", value: String(pendingSellers.filter((seller) => seller.status === "pending").length), delta: "seller requests" },
      { label: "Email Notifications", value: "Enabled", delta: "on approval" },
    ];
  }, [data.kpis, isSellersSection, pendingSellers]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#333] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">{title}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c39b22] transition-colors w-fit">
          {data.actionLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sellersKpis.map((item) => (
          <div key={item.label} className="bg-[#111] border border-[#333] rounded-xl p-5 hover:border-[#D4AF37]/50 transition-colors">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{item.label}</p>
            <p className="text-3xl font-serif text-white mb-2">{item.value}</p>
            <p className="text-xs text-[#D4AF37] font-semibold">{item.delta}</p>
          </div>
        ))}
      </div>

      {feedbackMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedbackType === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-400/40 bg-red-500/10 text-red-300"
          }`}
        >
          {feedbackMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-5">{data.activityTitle}</h2>
          <div className="space-y-3">
            {data.activity.map((item) => (
              <div key={item} className="rounded-lg bg-[#171717] border border-[#2a2a2a] px-4 py-3 text-gray-300 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-5">
            {isSellersSection ? "Seller Approval Requests" : data.queueTitle}
          </h2>

          {isSellersSection ? (
            <div className="space-y-4">
              <button
                onClick={() => void loadPendingSellers()}
                disabled={isLoadingSellers}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors disabled:opacity-60"
              >
                {isLoadingSellers ? "Refreshing..." : "Refresh Pending Requests"}
              </button>

              {isLoadingSellers && pendingSellers.length === 0 && (
                <p className="text-xs text-gray-400">Loading pending seller requests...</p>
              )}

              {!isLoadingSellers && pendingSellers.length === 0 && (
                <p className="text-xs text-emerald-300">No pending seller approvals right now.</p>
              )}

              {pendingSellers.map((seller) => (
                <div key={seller._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-white truncate">{seller.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10">
                      {seller.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 truncate">{seller.email}</p>
                  <button
                    onClick={() => void handleApproveSeller(seller)}
                    disabled={isApprovingSellerId === seller._id}
                    className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors disabled:opacity-60"
                  >
                    {isApprovingSellerId === seller._id ? "Approving..." : "Approve Seller"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data.queue.map((task) => (
                <div key={task.name} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-white">{task.name}</h3>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${statusColorMap[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{task.detail}</p>
                  <button className="text-xs font-semibold text-[#D4AF37] hover:text-white transition-colors">
                    Review -&gt;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
