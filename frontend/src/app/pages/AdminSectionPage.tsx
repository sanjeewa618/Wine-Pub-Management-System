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

interface CustomerUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

interface AdminOrder {
  _id: string;
  userId: string;
  total: number;
  status: string;
  createdAt: string;
  orderType: string;
}

interface AdminReservation {
  _id: string;
  userId: string;
  date: string;
  time: string;
  status: string;
  guestCount: number;
  customerName?: string;
  email?: string;
  tableLabels?: string[];
  tableLabel?: string;
  createdAt: string;
}

interface ReservationAdminConfig {
  totalTables: number;
  timeSlots: string[];
  tableNumbers: string[];
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
  const defaultReservationTimeSlots = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"];
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [isApprovingSellerId, setIsApprovingSellerId] = useState<string | null>(null);
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([]);
  const [ordersByUser, setOrdersByUser] = useState<Record<string, AdminOrder[]>>({});
  const [reservationsByUser, setReservationsByUser] = useState<Record<string, AdminReservation[]>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reservationItems, setReservationItems] = useState<AdminReservation[]>([]);
  const [reservationConfig, setReservationConfig] = useState<ReservationAdminConfig | null>(null);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedAvailabilityTime, setSelectedAvailabilityTime] = useState<string>("18:00");
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isUpdatingReservationId, setIsUpdatingReservationId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const isSellersSection = section === "sellers";
  const isUsersSection = section === "users";
  const isReservationsSection = section === "reservations";

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

  const loadUsersSectionData = async () => {
    setIsLoadingUsers(true);
    setFeedbackMessage("");

    try {
      const [usersResponse, ordersResponse, reservationsResponse] = await Promise.all([
        apiRequest<{ users?: CustomerUser[] }>("/users"),
        apiRequest<{ orders?: AdminOrder[] }>("/orders"),
        apiRequest<{ reservations?: AdminReservation[] }>("/reservations"),
      ]);

      const customers = (usersResponse.users || []).filter((user) => user.role === "customer");
      setCustomerUsers(customers);

      const groupedOrders: Record<string, AdminOrder[]> = {};
      (ordersResponse.orders || []).forEach((order) => {
        const userId = String(order.userId || "");
        if (!userId) return;
        if (!groupedOrders[userId]) groupedOrders[userId] = [];
        groupedOrders[userId].push(order);
      });
      Object.keys(groupedOrders).forEach((userId) => {
        groupedOrders[userId].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setOrdersByUser(groupedOrders);

      const groupedReservations: Record<string, AdminReservation[]> = {};
      (reservationsResponse.reservations || []).forEach((reservation) => {
        const userId = String(reservation.userId || "");
        if (!userId) return;
        if (!groupedReservations[userId]) groupedReservations[userId] = [];
        groupedReservations[userId].push(reservation);
      });
      Object.keys(groupedReservations).forEach((userId) => {
        groupedReservations[userId].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setReservationsByUser(groupedReservations);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load users section data");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isUsersSection) {
      return;
    }

    void loadUsersSectionData();
  }, [isUsersSection]);

  const loadReservationsSectionData = async (date = selectedAvailabilityDate, time = selectedAvailabilityTime) => {
    setIsLoadingReservations(true);
    setFeedbackMessage("");

    try {
      const [reservationsResponse, configResponse, availabilityResponse] = await Promise.all([
        apiRequest<{ reservations?: AdminReservation[] }>("/reservations"),
        apiRequest<{ config?: ReservationAdminConfig }>("/reservations/admin/config"),
        apiRequest<{ availableTables?: string[] }>(`/reservations/availability?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`),
      ]);

      const normalizedTimeSlots = defaultReservationTimeSlots;

      setReservationItems(reservationsResponse.reservations || []);
      setReservationConfig(
        configResponse.config
          ? {
              ...configResponse.config,
              timeSlots: normalizedTimeSlots,
            }
          : null
      );
      setSelectedAvailabilityTime((prev) =>
        normalizedTimeSlots.includes(prev) ? prev : normalizedTimeSlots[0]
      );
      setAvailableTables(availabilityResponse.availableTables || []);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load reservation admin data");
    } finally {
      setIsLoadingReservations(false);
    }
  };

  useEffect(() => {
    if (!isReservationsSection) {
      return;
    }

    void loadReservationsSectionData();
  }, [isReservationsSection]);

  const handleReservationStatus = async (reservationId: string, status: "confirmed" | "cancelled") => {
    setIsUpdatingReservationId(reservationId);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ message?: string }>(`/reservations/${reservationId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      setFeedbackType("success");
      setFeedbackMessage(response.message || `Reservation ${status}`);
      await loadReservationsSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to update reservation status");
    } finally {
      setIsUpdatingReservationId(null);
    }
  };

  const handleAddTable = async () => {
    const current = Number(reservationConfig?.totalTables || 25);
    const nextValue = current + 1;

    try {
      const response = await apiRequest<{ message?: string }>("/reservations/admin/tables", {
        method: "PUT",
        body: JSON.stringify({ totalTables: nextValue }),
      });
      setFeedbackType("success");
      setFeedbackMessage(response.message || `Total tables updated to ${nextValue}`);
      await loadReservationsSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to add table");
    }
  };

  const handleAddTimeSlot = async () => {
    const entered = window.prompt("Enter new time slot (HH:mm)", "19:00");
    if (!entered) return;

    try {
      const response = await apiRequest<{ message?: string }>("/reservations/admin/time-slots", {
        method: "POST",
        body: JSON.stringify({ timeSlot: entered.trim() }),
      });
      setFeedbackType("success");
      setFeedbackMessage(response.message || `Time slot ${entered} added`);
      await loadReservationsSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to add time slot");
    }
  };

  const handleDeleteCustomer = async (user: CustomerUser) => {
    setIsDeletingUserId(user._id);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ message?: string }>(`/users/${user._id}`, {
        method: "DELETE",
      });

      setFeedbackType("success");
      setFeedbackMessage(response.message || `${user.name} deleted successfully`);
      await loadUsersSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to delete customer");
    } finally {
      setIsDeletingUserId(null);
    }
  };

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

  const usersKpis = useMemo(() => {
    if (!isUsersSection) {
      return data.kpis;
    }

    const totalCustomers = customerUsers.length;
    const blockedCount = customerUsers.filter((user) => user.status === "blocked").length;
    const activeCount = customerUsers.filter((user) => user.status === "active").length;
    const ratings = customerUsers
      .map((user) => Number((user as unknown as { rating?: number }).rating || 0))
      .filter((rating) => !Number.isNaN(rating) && rating > 0);
    const avgRating = ratings.length
      ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)
      : "N/A";

    const blockedDelta = totalCustomers
      ? `${Math.round((blockedCount / totalCustomers) * 100)}% of customers`
      : "all clear";

    const totalDelta = activeCount > 0 ? `${activeCount} active now` : "no active customers";

    return [
      { label: "Total Accounts", value: String(totalCustomers), delta: totalDelta },
      { label: "Blocked Accounts", value: String(blockedCount), delta: blockedCount ? blockedDelta : "all clear" },
      { label: "Users Ratings", value: avgRating, delta: ratings.length ? "average / 5" : "No customer ratings yet" },
    ];
  }, [customerUsers, data.kpis, isUsersSection]);

  const reservationKpis = useMemo(() => {
    if (!isReservationsSection) {
      return data.kpis;
    }

    const confirmed = reservationItems.filter((item) => item.status === "confirmed").length;
    const pending = reservationItems.filter((item) => item.status === "pending").length;
    const available = availableTables.length;

    return [
      { label: "Confirmed Reservations", value: String(confirmed), delta: "approved bookings" },
      { label: "Pending Reservations", value: String(pending), delta: pending > 0 ? "needs action" : "all reviewed" },
      { label: "Available Reservations", value: String(available), delta: `${selectedAvailabilityDate} ${selectedAvailabilityTime}` },
    ];
  }, [availableTables.length, data.kpis, isReservationsSection, reservationItems, selectedAvailabilityDate, selectedAvailabilityTime]);

  const pendingReservationAlerts = useMemo(
    () => reservationItems.filter((item) => item.status === "pending").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reservationItems]
  );

  const recentReservationActivities = useMemo(
    () => [...reservationItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [reservationItems]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-[#333] pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white font-bold mb-2">{title}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>
        {isReservationsSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadReservationsSectionData()}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Refresh Alerts
            </button>
            <button
              onClick={() => void handleAddTable()}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] transition-colors"
            >
              Add Table
            </button>
            <button
              onClick={() => void handleAddTimeSlot()}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] transition-colors"
            >
              Add Time Slot
            </button>
          </div>
        ) : !isUsersSection && (
          <button className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c39b22] transition-colors w-fit">
            {data.actionLabel}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(isUsersSection ? usersKpis : isReservationsSection ? reservationKpis : sellersKpis).map((item) => (
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

      {isUsersSection ? (
        <div className="bg-gradient-to-b from-[#121212] to-[#0f0f0f] border border-[#333] rounded-xl p-6 space-y-4 shadow-[0_0_0_1px_rgba(212,175,55,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-white text-lg font-bold">Registered Customers</h2>
            <button
              onClick={() => void loadUsersSectionData()}
              disabled={isLoadingUsers}
              className="rounded-lg border border-[#D4AF37]/40 bg-[#1a1a1a] px-4 py-2 text-xs font-semibold text-[#D4AF37] hover:text-black hover:bg-[#D4AF37] transition-colors disabled:opacity-60"
            >
              {isLoadingUsers ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>

          {isLoadingUsers && customerUsers.length === 0 && <p className="text-sm text-gray-400">Loading customer accounts...</p>}
          {!isLoadingUsers && customerUsers.length === 0 && <p className="text-sm text-gray-400">No registered customers found.</p>}

          <div className="space-y-3">
            {customerUsers.map((user) => {
              const userOrders = ordersByUser[user._id] || [];
              const userReservations = reservationsByUser[user._id] || [];
              const isExpanded = expandedUserId === user._id;

              return (
                <div key={user._id} className="rounded-xl border border-[#2a2a2a] bg-[#151515] p-4 space-y-3 hover:border-[#D4AF37]/35 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <p className="text-white text-xl font-semibold leading-tight">{user.name}</p>
                      <p className="text-sm text-gray-300 mt-1">{user.email}</p>
                      <p className="text-sm text-gray-400 mt-1.5">Joined: {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end lg:ml-auto">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                          user.status === "blocked"
                            ? "text-red-300 border-red-400/30 bg-red-500/10"
                            : "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
                        }`}
                      >
                        {user.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10">
                        Orders: {userOrders.length}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10">
                        Reservations: {userReservations.length}
                      </span>

                      <button
                        onClick={() => void handleDeleteCustomer(user)}
                        disabled={isDeletingUserId === user._id}
                        className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors disabled:opacity-60"
                      >
                        {isDeletingUserId === user._id ? "Deleting..." : "Delete Account"}
                      </button>

                      <button
                        onClick={() => setExpandedUserId(isExpanded ? null : user._id)}
                        className="rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors lg:ml-2"
                      >
                        {isExpanded ? "Hide History" : "View History"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 pt-2 border-t border-[#2a2a2a]">
                      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                        <h3 className="text-sm font-semibold text-white mb-2">Order History</h3>
                        {userOrders.length === 0 ? (
                          <p className="text-xs text-gray-400">No orders found.</p>
                        ) : (
                          <div className="space-y-2">
                            {userOrders.slice(0, 10).map((order) => (
                              <div key={order._id} className="text-xs text-gray-300 border border-[#242424] rounded p-2 bg-[#171717]">
                                <p>Order #{order._id.slice(-6)} - {order.status}</p>
                                <p className="text-gray-400">LKR {Number(order.total || 0).toFixed(2)} - {new Date(order.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                        <h3 className="text-sm font-semibold text-white mb-2">Reservation History</h3>
                        {userReservations.length === 0 ? (
                          <p className="text-xs text-gray-400">No reservations found.</p>
                        ) : (
                          <div className="space-y-2">
                            {userReservations.slice(0, 10).map((reservation) => (
                              <div key={reservation._id} className="text-xs text-gray-300 border border-[#242424] rounded p-2 bg-[#171717]">
                                <p>{reservation.status} - Guests: {reservation.guestCount}</p>
                                <p className="text-gray-400">{reservation.date} {reservation.time} - {new Date(reservation.createdAt).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : isReservationsSection ? (
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#333] rounded-xl p-5">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
              <div>
                <h2 className="text-white text-lg font-bold">Reservations Alerts</h2>
                <p className="text-xs text-gray-400 mt-1">Pending reservations require admin confirmation or cancellation.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <label className="text-[11px] text-gray-500">Date</label>
                  <input
                    type="date"
                    value={selectedAvailabilityDate}
                    onChange={(event) => setSelectedAvailabilityDate(event.target.value)}
                    className="ml-2 rounded border border-[#2a2a2a] bg-[#161616] px-2 py-1 text-xs text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Time Slot</label>
                  <select
                    value={selectedAvailabilityTime}
                    onChange={(event) => setSelectedAvailabilityTime(event.target.value)}
                    className="ml-2 rounded border border-[#2a2a2a] bg-[#161616] px-2 py-1 text-xs text-gray-200"
                  >
                    {(reservationConfig?.timeSlots || defaultReservationTimeSlots).map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => void loadReservationsSectionData(selectedAvailabilityDate, selectedAvailabilityTime)}
                  className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
                >
                  Check Availability
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-5">Pending Reservation Alerts</h2>

              {isLoadingReservations && pendingReservationAlerts.length === 0 && (
                <p className="text-sm text-gray-400">Loading reservation alerts...</p>
              )}

              {!isLoadingReservations && pendingReservationAlerts.length === 0 && (
                <p className="text-sm text-emerald-300">No pending reservation alerts right now.</p>
              )}

              <div className="space-y-3">
                {pendingReservationAlerts.map((reservation) => {
                  const tableDetails =
                    reservation.tableLabels?.length
                      ? reservation.tableLabels.join(", ")
                      : reservation.tableLabel || "N/A";

                  return (
                    <div key={reservation._id} className="rounded-lg bg-[#171717] border border-[#2a2a2a] px-4 py-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-sm text-white font-semibold">{reservation.customerName || reservation.email || "Customer"}</p>
                          <p className="text-xs text-gray-400">{reservation.date} at {reservation.time} • Guests: {reservation.guestCount}</p>
                          <p className="text-xs text-[#D4AF37] mt-1">Tables: {tableDetails}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleReservationStatus(reservation._id, "confirmed")}
                            disabled={isUpdatingReservationId === reservation._id}
                            className="rounded-md border border-emerald-400/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => void handleReservationStatus(reservation._id, "cancelled")}
                            disabled={isUpdatingReservationId === reservation._id}
                            className="rounded-md border border-red-400/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-5">Recent Reservation Activities</h2>
              <div className="space-y-3">
                {recentReservationActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent reservation activities.</p>
                ) : (
                  recentReservationActivities.map((reservation) => {
                    const tableDetails = reservation.tableLabels?.length
                      ? reservation.tableLabels.join(", ")
                      : reservation.tableLabel || "N/A";

                    return (
                      <div key={reservation._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                        <p className="text-xs text-white font-semibold capitalize">{reservation.status}</p>
                        <p className="text-xs text-gray-400 mt-1">{reservation.date} {reservation.time} • Guests: {reservation.guestCount}</p>
                        <p className="text-xs text-[#D4AF37] mt-1">Tables: {tableDetails}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <h2 className="text-white text-lg font-bold mb-3">Table Numbers & Time Slot Details</h2>
            <p className="text-xs text-gray-400 mb-4">These values are loaded from database-backed reservation config.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Configured Tables ({reservationConfig?.totalTables || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {(reservationConfig?.tableNumbers || []).map((table) => (
                    <span key={table} className="px-2 py-1 text-[11px] rounded border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                      {table}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Available Tables ({selectedAvailabilityDate} {selectedAvailabilityTime})</p>
                <div className="flex flex-wrap gap-2">
                  {availableTables.length === 0 ? (
                    <span className="text-xs text-gray-400">No available tables for selected slot</span>
                  ) : (
                    availableTables.map((table) => (
                      <span key={table} className="px-2 py-1 text-[11px] rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
                        {table}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};
