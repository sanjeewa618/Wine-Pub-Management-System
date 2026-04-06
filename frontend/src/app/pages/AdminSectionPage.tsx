import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/api";
import { EditableProductItem, ProductEditorModal, ProductEditorMode } from "../components/ProductEditorModal";

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

interface SellerUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  sellerType?: string;
  rating: number;
  totalRatings: number;
  businessDescription: string;
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

interface AdminWineItem {
  _id: string;
  name: string;
  productType: "wine" | "arrack" | "whiskey" | "whisky" | "rum" | "beer";
  category: string;
  subCategory?: string;
  brand?: string;
  country?: string;
  originType?: string;
  price: number;
  sizes?: string[];
  sizePricing?: { size: string; price: number }[];
  stock: number;
  rating?: number;
  description?: string;
  alcoholPercentage?: string;
  image?: string;
  spiceLevel?: string;
  vegType?: string;
  pairWith?: string;
  popularInPub?: boolean;
  sellerId?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminBiteItem {
  _id: string;
  name: string;
  productType: "bite" | "food" | "beverage";
  category: string;
  subCategory?: string;
  brand?: string;
  country?: string;
  originType?: string;
  price: number;
  sizes?: Array<string | { size: string; price: number }>;
  sizePricing?: { size: string; price: number }[];
  stock: number;
  rating?: number;
  description?: string;
  alcoholPercentage?: string;
  image?: string;
  spiceLevel?: string;
  vegType?: string;
  pairWith?: string;
  popularInPub?: boolean;
  sellerId?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
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
  const outOfStockSectionRef = useRef<HTMLDivElement | null>(null);
  const outOfStockBitesSectionRef = useRef<HTMLDivElement | null>(null);
  const [pendingSellers, setPendingSellers] = useState<PendingSeller[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [isApprovingSellerId, setIsApprovingSellerId] = useState<string | null>(null);
  const [sellersList, setSellersList] = useState<SellerUser[]>([]);
  const [sellerStats, setSellerStats] = useState<{ totalSellers: number; activeSellers: number; pendingSellers: number; blockedSellers: number; averageRating: number } | null>(null);
  const [isBlockingSellerId, setIsBlockingSellerId] = useState<string | null>(null);
  const [isDeletingSellerId, setIsDeletingSellerId] = useState<string | null>(null);
  const [expandedSellerId, setExpandedSellerId] = useState<string | null>(null);
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
  const [wineItems, setWineItems] = useState<AdminWineItem[]>([]);
  const [isLoadingWines, setIsLoadingWines] = useState(false);
  const [showOutOfStockList, setShowOutOfStockList] = useState(false);
  const [biteItems, setBiteItems] = useState<AdminBiteItem[]>([]);
  const [isLoadingBites, setIsLoadingBites] = useState(false);
  const [showOutOfStockBitesList, setShowOutOfStockBitesList] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState<ProductEditorMode>("wine");
  const [productModalItem, setProductModalItem] = useState<EditableProductItem | null>(null);
  const [isChangePickerOpen, setIsChangePickerOpen] = useState(false);
  const [changePickerMode, setChangePickerMode] = useState<ProductEditorMode>("wine");
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const isSellersSection = section === "sellers";
  const isUsersSection = section === "users";
  const isReservationsSection = section === "reservations";
  const isWinesSection = section === "wines";
  const isBitesSection = section === "bites";

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

  const loadSellersSectionData = async () => {
    setIsLoadingSellers(true);
    setFeedbackMessage("");

    try {
      const [sellersResponse, queueResponse] = await Promise.all([
        apiRequest<{ sellers?: SellerUser[]; stats?: any }>("/users/sellers/list"),
        apiRequest<{ queues?: { pendingSellers?: PendingSeller[] } }>("/admin/queues"),
      ]);

      setSellersList(sellersResponse.sellers || []);
      setSellerStats(sellersResponse.stats || null);
      setPendingSellers(queueResponse.queues?.pendingSellers ?? []);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load sellers section data");
    } finally {
      setIsLoadingSellers(false);
    }
  };

  useEffect(() => {
    if (!isSellersSection) {
      return;
    }

    void loadSellersSectionData();
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

  const loadWinesSectionData = async (options?: { preserveFeedback?: boolean }) => {
    setIsLoadingWines(true);
    if (!options?.preserveFeedback) {
      setFeedbackMessage("");
    }

    try {
      const [winesResponse, sellersResponse] = await Promise.all([
        apiRequest<{ items?: AdminWineItem[] }>("/wines"),
        apiRequest<{ sellers?: SellerUser[]; stats?: { totalSellers?: number } }>("/users/sellers/list"),
      ]);

      setWineItems(winesResponse.items || []);
      if (sellersResponse.sellers) {
        setSellersList(sellersResponse.sellers);
      }
      if (sellersResponse.stats) {
        setSellerStats((prev) => ({
          totalSellers: Number(sellersResponse.stats?.totalSellers || prev?.totalSellers || 0),
          activeSellers: Number(prev?.activeSellers || 0),
          pendingSellers: Number(prev?.pendingSellers || 0),
          blockedSellers: Number(prev?.blockedSellers || 0),
          averageRating: Number(prev?.averageRating || 0),
        }));
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load liquor data");
    } finally {
      setIsLoadingWines(false);
    }
  };

  useEffect(() => {
    if (!isWinesSection) {
      return;
    }

    void loadWinesSectionData();
  }, [isWinesSection]);

  const loadBitesSectionData = async (options?: { preserveFeedback?: boolean }) => {
    setIsLoadingBites(true);
    if (!options?.preserveFeedback) {
      setFeedbackMessage("");
    }

    try {
      const [bitesResponse, sellersResponse] = await Promise.all([
        apiRequest<{ items?: AdminBiteItem[] }>("/bites"),
        apiRequest<{ sellers?: SellerUser[] }>("/users/sellers/list"),
      ]);

      setBiteItems(bitesResponse.items || []);
      if (sellersResponse.sellers) {
        setSellersList(sellersResponse.sellers);
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load menu data");
    } finally {
      setIsLoadingBites(false);
    }
  };

  useEffect(() => {
    if (!isBitesSection) {
      return;
    }

    void loadBitesSectionData();
  }, [isBitesSection]);

  useEffect(() => {
    if (!isWinesSection && !isBitesSection) {
      return;
    }

    const timer = window.setInterval(() => {
      if (isWinesSection) {
        void loadWinesSectionData();
      }
      if (isBitesSection) {
        void loadBitesSectionData();
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isBitesSection, isWinesSection]);

  const openAddProductModal = (mode: ProductEditorMode) => {
    setProductModalMode(mode);
    setProductModalItem(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (mode: ProductEditorMode, item: AdminWineItem | AdminBiteItem) => {
    setProductModalMode(mode);
    setProductModalItem(item);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    if (isSavingProduct) {
      return;
    }

    setIsProductModalOpen(false);
    setProductModalItem(null);
  };

  const openChangePicker = (mode: ProductEditorMode) => {
    setChangePickerMode(mode);
    setIsChangePickerOpen(true);
  };

  const closeChangePicker = () => {
    setIsChangePickerOpen(false);
  };

  const handlePickItemForEdit = (item: AdminWineItem | AdminBiteItem) => {
    setIsChangePickerOpen(false);
    openEditProductModal(changePickerMode, item);
  };

  const handleOutOfStockCardClick = () => {
    setShowOutOfStockList(true);
    outOfStockSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveProduct = async (payload: Record<string, unknown>, itemId?: string) => {
    const isWine = productModalMode === "wine";
    const basePath = isWine ? "/wines" : "/bites";
    const targetPath = itemId ? `${basePath}/${itemId}` : basePath;

    setIsSavingProduct(true);
    setFeedbackMessage("");

    try {
      await apiRequest(targetPath, {
        method: itemId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (isWine) {
        await loadWinesSectionData({ preserveFeedback: true });
      } else {
        await loadBitesSectionData({ preserveFeedback: true });
      }

      setFeedbackType("success");
      setFeedbackMessage(itemId ? "Item updated successfully." : "Item added successfully.");
      setIsProductModalOpen(false);
      setProductModalItem(null);
      setIsChangePickerOpen(false);
    } catch (error) {
      setFeedbackType("error");
      const message = error instanceof Error ? error.message : "Failed to save item";
      setFeedbackMessage(message);
      throw new Error(message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleOutOfStockBitesCardClick = () => {
    setShowOutOfStockBitesList(true);
    outOfStockBitesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      await loadSellersSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to approve seller");
    } finally {
      setIsApprovingSellerId(null);
    }
  };

  const handleBlockSeller = async (seller: SellerUser) => {
    setIsBlockingSellerId(seller._id);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ message?: string }>(`/users/${seller._id}/block-seller`, {
        method: "PUT",
      });

      setFeedbackType("success");
      setFeedbackMessage(response.message || `${seller.name} blocked successfully`);
      await loadSellersSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to block seller");
    } finally {
      setIsBlockingSellerId(null);
    }
  };

  const handleDeleteSeller = async (seller: SellerUser) => {
    setIsDeletingSellerId(seller._id);
    setFeedbackMessage("");

    try {
      const response = await apiRequest<{ message?: string }>(`/users/${seller._id}/seller`, {
        method: "DELETE",
      });

      setFeedbackType("success");
      setFeedbackMessage(response.message || `${seller.name} deleted successfully`);
      await loadSellersSectionData();
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to delete seller");
    } finally {
      setIsDeletingSellerId(null);
    }
  };

  const sellersKpis = useMemo(() => {
    if (!isSellersSection) {
      return data.kpis;
    }

    return [
      { label: "Total Registered Sellers", value: String(sellerStats?.totalSellers || 0), delta: `${sellerStats?.activeSellers || 0} active` },
      { label: "Pending Approvals", value: String(sellerStats?.pendingSellers || 0), delta: sellerStats?.pendingSellers ? "needs review" : "all approved" },
      { label: "Blocked Sellers", value: String(sellerStats?.blockedSellers || 0), delta: sellerStats?.blockedSellers ? "restricted" : "none" },
    ];
  }, [data.kpis, isSellersSection, sellerStats]);

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

  const winesKpis = useMemo(() => {
    if (!isWinesSection) {
      return data.kpis;
    }

    const totalLiquors = wineItems.length;
    const registeredSuppliers = sellerStats?.totalSellers || sellersList.length;
    const outOfStockCategories = new Set(wineItems.filter((item) => Number(item.stock || 0) <= 0).map((item) => item.productType)).size;

    return [
      { label: "Total Number Of Liquours", value: String(totalLiquors), delta: "arrack, wine, beer, whiskey, rum" },
      { label: "Total Registered Liquour Suppliers", value: String(registeredSuppliers), delta: "admin and sellers can add" },
      { label: "Out Of Stock Categories", value: String(outOfStockCategories), delta: "click to view list" },
    ];
  }, [data.kpis, isWinesSection, sellerStats?.totalSellers, sellersList.length, wineItems]);

  const outOfStockLiquors = useMemo(
    () => wineItems.filter((item) => Number(item.stock || 0) <= 0).sort((a, b) => a.productType.localeCompare(b.productType)),
    [wineItems]
  );

  const recentLiquorActivities = useMemo(() => {
    const productActivities = wineItems.slice(0, 20).map((item) => ({
      id: `product-${item._id}`,
      title: `${item.name} ${new Date(item.createdAt).getTime() === new Date(item.updatedAt).getTime() ? "added" : "updated"}`,
      detail: `${item.productType.toUpperCase()} · ${item.category} · Stock ${item.stock}`,
      time: new Date(item.updatedAt || item.createdAt).getTime(),
    }));

    const sellerActivities = sellersList.slice(0, 20).map((seller) => ({
      id: `seller-${seller._id}`,
      title: `${seller.name} supplier account ${seller.status === "pending" ? "registered" : seller.status}`,
      detail: `${seller.email} · ${seller.sellerType || "seller"}`,
      time: new Date(seller.createdAt || Date.now()).getTime(),
    }));

    return [...productActivities, ...sellerActivities].sort((a, b) => b.time - a.time).slice(0, 12);
  }, [sellersList, wineItems]);

  const bitesKpis = useMemo(() => {
    if (!isBitesSection) {
      return data.kpis;
    }

    const totalItems = biteItems.length;
    const restaurantSuppliers = sellersList.filter((seller) => ["restaurant", "snacks_provider"].includes(String(seller.sellerType || ""))).length;
    const outOfStockItems = biteItems.filter((item) => Number(item.stock || 0) <= 0).length;

    return [
      { label: "Number Of Items", value: String(totalItems), delta: "foods, juice, bites & snacks, soft drinks" },
      { label: "Total Registered Resturents", value: String(restaurantSuppliers), delta: "restaurant and snack providers" },
      { label: "Out Of Stocks", value: String(outOfStockItems), delta: "click to view list" },
    ];
  }, [biteItems, data.kpis, isBitesSection, sellersList]);

  const outOfStockBitesItems = useMemo(
    () => biteItems.filter((item) => Number(item.stock || 0) <= 0).sort((a, b) => a.productType.localeCompare(b.productType)),
    [biteItems]
  );

  const recentMenuActivities = useMemo(() => {
    const menuActivities = biteItems.slice(0, 20).map((item) => ({
      id: `menu-${item._id}`,
      title: `${item.name} ${new Date(item.createdAt).getTime() === new Date(item.updatedAt).getTime() ? "added" : "updated"}`,
      detail: `${item.productType.toUpperCase()} · ${item.category} · Stock ${item.stock}`,
      time: new Date(item.updatedAt || item.createdAt).getTime(),
    }));

    const supplierActivities = sellersList
      .filter((seller) => ["restaurant", "snacks_provider"].includes(String(seller.sellerType || "")))
      .slice(0, 20)
      .map((seller) => ({
        id: `supplier-${seller._id}`,
        title: `${seller.name} ${seller.status === "pending" ? "registration requested" : "supplier account active"}`,
        detail: `${seller.email} · ${seller.sellerType || "seller"}`,
        time: new Date(seller.createdAt || Date.now()).getTime(),
      }));

    return [...menuActivities, ...supplierActivities].sort((a, b) => b.time - a.time).slice(0, 12);
  }, [biteItems, sellersList]);

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
        ) : isWinesSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openChangePicker("wine")}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Change Items
            </button>
            <button
              onClick={() => openAddProductModal("wine")}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] transition-colors"
            >
              Add Wine
            </button>
          </div>
        ) : isBitesSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openChangePicker("bite")}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Change Items
            </button>
            <button
              onClick={() => openAddProductModal("bite")}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] transition-colors"
            >
              Add Item
            </button>
          </div>
        ) : !isUsersSection && (
          <button className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c39b22] transition-colors w-fit">
            {data.actionLabel}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(isUsersSection ? usersKpis : isReservationsSection ? reservationKpis : isWinesSection ? winesKpis : isBitesSection ? bitesKpis : sellersKpis).map((item) => (
          <div
            key={item.label}
            onClick={() => {
              if (isWinesSection && item.label === "Out Of Stock Categories") {
                handleOutOfStockCardClick();
              }
              if (isBitesSection && item.label === "Out Of Stocks") {
                handleOutOfStockBitesCardClick();
              }
            }}
            className={`bg-[#111] border border-[#333] rounded-xl p-5 hover:border-[#D4AF37]/50 transition-colors ${
              (isWinesSection && item.label === "Out Of Stock Categories") ||
              (isBitesSection && item.label === "Out Of Stocks")
                ? "cursor-pointer"
                : ""
            }`}
          >
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
      ) : isSellersSection ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-white text-lg font-bold">Registered Sellers</h2>
                <button
                  onClick={() => void loadSellersSectionData()}
                  disabled={isLoadingSellers}
                  className="rounded-lg border border-[#D4AF37]/40 bg-[#1a1a1a] px-4 py-2 text-xs font-semibold text-[#D4AF37] hover:text-black hover:bg-[#D4AF37] transition-colors disabled:opacity-60"
                >
                  {isLoadingSellers ? "Refreshing..." : "Refresh Data"}
                </button>
              </div>

              {isLoadingSellers && sellersList.length === 0 && (
                <p className="text-sm text-gray-400">Loading sellers...</p>
              )}
              {!isLoadingSellers && sellersList.length === 0 && (
                <p className="text-sm text-gray-400">No registered sellers found.</p>
              )}

              <div className="space-y-4">
                {sellersList.map((seller) => {
                  const isExpanded = expandedSellerId === seller._id;
                  const sellerTypeName = {
                    liquor_supplier: "Liquor Supplier",
                    restaurant: "Restaurant",
                    wine_company: "Wine Company",
                    beer_company: "Beer Company",
                    snacks_provider: "Snacks Provider",
                  }[seller.sellerType || ""] || "Seller";
                  const initials = seller.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div key={seller._id} className="rounded-xl border border-[#2b2b2b] bg-gradient-to-b from-[#171717] to-[#131313] p-5 space-y-4 hover:border-[#D4AF37]/40 transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-sm font-bold tracking-wide">
                            {initials || "SL"}
                          </div>
                          <div>
                            <p className="text-white text-lg font-semibold leading-tight">{seller.name}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-[#D4AF37] mt-1">Company Profile</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10">
                            {sellerTypeName}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${
                              seller.status === "blocked"
                                ? "text-red-300 border-red-400/30 bg-red-500/10"
                                : seller.status === "pending"
                                ? "text-orange-300 border-orange-400/30 bg-orange-500/10"
                                : "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
                            }`}
                          >
                            {seller.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-[#242424] bg-[#111]/70 p-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Business Email</p>
                          <p className="text-sm text-gray-200 mt-1 break-all">{seller.email || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Contact Number</p>
                          <p className="text-sm text-gray-200 mt-1">{seller.phone || "Not provided"}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Registered On</p>
                          <p className="text-sm text-gray-300 mt-1">{seller.createdAt ? new Date(seller.createdAt).toLocaleString() : "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#242424]">
                        {seller.status === "pending" && (
                          <button
                            onClick={() => void handleApproveSeller(seller as unknown as PendingSeller)}
                            disabled={isApprovingSellerId === seller._id}
                            className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                          >
                            {isApprovingSellerId === seller._id ? "Approving..." : "Approve"}
                          </button>
                        )}

                        <button
                          onClick={() => void handleBlockSeller(seller)}
                          disabled={isBlockingSellerId === seller._id}
                          className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                        >
                          {isBlockingSellerId === seller._id ? "Blocking..." : "Block"}
                        </button>

                        <button
                          onClick={() => void handleDeleteSeller(seller)}
                          disabled={isDeletingSellerId === seller._id}
                          className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                        >
                          {isDeletingSellerId === seller._id ? "Deleting..." : "Delete"}
                        </button>

                        <button
                          onClick={() => setExpandedSellerId(isExpanded ? null : seller._id)}
                          className="rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors lg:ml-auto"
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-[#2a2a2a] pt-3">
                          <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                            <h3 className="text-sm font-semibold text-white mb-2">Business Information</h3>
                            <p className="text-xs text-gray-300">{seller.businessDescription || "No description provided"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-5">Seller Approval Requests</h2>
              <div className="space-y-3">
                {isLoadingSellers && pendingSellers.length === 0 && (
                  <p className="text-sm text-gray-400">Loading approval requests...</p>
                )}
                {!isLoadingSellers && pendingSellers.length === 0 && (
                  <p className="text-sm text-emerald-300">No pending seller approvals right now.</p>
                )}
                {pendingSellers.map((seller) => (
                  <div key={seller._id} className="rounded-lg border border-orange-400/40 bg-orange-500/10 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{seller.name}</p>
                        <p className="text-xs text-gray-300 mt-1">{seller.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Registered: {seller.createdAt ? new Date(seller.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border text-orange-300 border-orange-400/40 bg-orange-500/20 whitespace-nowrap">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => void handleApproveSeller(seller)}
                        disabled={isApprovingSellerId === seller._id}
                        className="flex-1 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                      >
                        {isApprovingSellerId === seller._id ? "Approving..." : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => void handleBlockSeller(seller as unknown as SellerUser)}
                        disabled={isBlockingSellerId === seller._id}
                        className="flex-1 rounded-md border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                      >
                        {isBlockingSellerId === seller._id ? "Canceling..." : "✕ Cancel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : isWinesSection ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-white text-lg font-bold">Recent Activities</h2>
                <span className="text-xs text-gray-400">Real-time supplier and liquor updates</span>
              </div>

              <div
                className="max-h-[440px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {isLoadingWines && recentLiquorActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading activity stream...</p>
                ) : recentLiquorActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent activities found.</p>
                ) : (
                  <div className="space-y-3">
                    {recentLiquorActivities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                        <p className="text-sm text-white font-semibold">{activity.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.detail}</p>
                        <p className="text-xs text-[#D4AF37] mt-1">{new Date(activity.time).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between gap-2 mb-5">
                <h2 className="text-white text-lg font-bold">Liquour Catalog</h2>
                <span className="text-xs text-gray-400">DB synced</span>
              </div>
              <div
                className="space-y-3 max-h-[440px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {isLoadingWines && wineItems.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading catalog...</p>
                ) : wineItems.length === 0 ? (
                  <p className="text-sm text-gray-400">No liquor items found in catalog.</p>
                ) : (
                  wineItems.slice(0, 40).map((item) => (
                    <div key={item._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-1 uppercase">{item.productType} · {item.category}</p>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${Number(item.stock || 0) <= 0 ? "text-red-300 border-red-400/30 bg-red-500/10" : "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"}`}>
                          {Number(item.stock || 0) <= 0 ? "Out" : `Stock ${item.stock}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#D4AF37] mt-2">LKR {Number(item.price || 0).toFixed(2)} {item.brand ? `· ${item.brand}` : ""}</p>
                      <button
                        onClick={() => openEditProductModal("wine", item)}
                        className="mt-2 rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                      >
                        Edit Item
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div ref={outOfStockSectionRef} className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-white text-lg font-bold">Out Of Stock Items</h2>
              <button
                onClick={() => setShowOutOfStockList((prev) => !prev)}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
              >
                {showOutOfStockList ? "Hide List" : "Show List"}
              </button>
            </div>

            {showOutOfStockList ? (
              outOfStockLiquors.length === 0 ? (
                <p className="text-sm text-emerald-300">No out-of-stock liquor items right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {outOfStockLiquors.map((item) => (
                    <div key={item._id} className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
                      <p className="text-sm text-white font-semibold">{item.name}</p>
                      <p className="text-xs text-red-200 mt-1 uppercase">{item.productType} · {item.category}</p>
                      <p className="text-xs text-gray-300 mt-1">Brand: {item.brand || "N/A"}</p>
                      <p className="text-xs text-gray-300 mt-1">Last update: {new Date(item.updatedAt || item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-gray-400">Click Show List or click the Out Of Stock Categories KPI card.</p>
            )}
          </div>
        </div>
      ) : isBitesSection ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-white text-lg font-bold">Recent Activities</h2>
                <span className="text-xs text-gray-400">Real-time restaurant and menu updates</span>
              </div>

              <div
                className="max-h-[440px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {isLoadingBites && recentMenuActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading activity stream...</p>
                ) : recentMenuActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent activities found.</p>
                ) : (
                  <div className="space-y-3">
                    {recentMenuActivities.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                        <p className="text-sm text-white font-semibold">{activity.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.detail}</p>
                        <p className="text-xs text-[#D4AF37] mt-1">{new Date(activity.time).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between gap-2 mb-5">
                <h2 className="text-white text-lg font-bold">Menu Catelog</h2>
                <span className="text-xs text-gray-400">DB synced</span>
              </div>
              <div
                className="space-y-3 max-h-[440px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {isLoadingBites && biteItems.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading menu catalog...</p>
                ) : biteItems.length === 0 ? (
                  <p className="text-sm text-gray-400">No menu items found.</p>
                ) : (
                  biteItems.slice(0, 40).map((item) => (
                    <div key={item._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-white font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-1 uppercase">{item.productType} · {item.category}</p>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${Number(item.stock || 0) <= 0 ? "text-red-300 border-red-400/30 bg-red-500/10" : "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"}`}>
                          {Number(item.stock || 0) <= 0 ? "Out" : `Stock ${item.stock}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#D4AF37] mt-2">LKR {Number(item.price || 0).toFixed(2)} {item.brand ? `· ${item.brand}` : ""}</p>
                      <button
                        onClick={() => openEditProductModal("bite", item)}
                        className="mt-2 rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                      >
                        Edit Item
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div ref={outOfStockBitesSectionRef} className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-white text-lg font-bold">Out Of Stock Items</h2>
              <button
                onClick={() => setShowOutOfStockBitesList((prev) => !prev)}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
              >
                {showOutOfStockBitesList ? "Hide List" : "Show List"}
              </button>
            </div>

            {showOutOfStockBitesList ? (
              outOfStockBitesItems.length === 0 ? (
                <p className="text-sm text-emerald-300">No out-of-stock menu items right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {outOfStockBitesItems.map((item) => (
                    <div key={item._id} className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
                      <p className="text-sm text-white font-semibold">{item.name}</p>
                      <p className="text-xs text-red-200 mt-1 uppercase">{item.productType} · {item.category}</p>
                      <p className="text-xs text-gray-300 mt-1">Brand: {item.brand || "N/A"}</p>
                      <p className="text-xs text-gray-300 mt-1">Last update: {new Date(item.updatedAt || item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-xs text-gray-400">Click Show List or click the Out Of Stocks KPI card.</p>
            )}
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

      {isChangePickerOpen && (
        <div className="fixed inset-0 z-[85] bg-black/65 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#363636] bg-[#121212] p-5 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Change Items</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Select a {changePickerMode === "wine" ? "liquor" : "menu"} item to update details.
                </p>
              </div>
              <button
                onClick={closeChangePicker}
                className="rounded-md border border-[#3c3c3c] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#D4AF37]/60 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]">
              {(changePickerMode === "wine" ? wineItems : biteItems).length === 0 ? (
                <p className="text-sm text-gray-400">
                  No {changePickerMode === "wine" ? "liquor" : "menu"} items found.
                </p>
              ) : (
                (changePickerMode === "wine" ? wineItems : biteItems).map((item) => (
                  <div key={item._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-1 uppercase">{item.productType} · {item.category}</p>
                      <p className="text-xs text-[#D4AF37] mt-1">LKR {Number(item.price || 0).toFixed(2)} · Stock {item.stock}</p>
                    </div>
                    <button
                      onClick={() => handlePickItemForEdit(item)}
                      className="rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ProductEditorModal
        isOpen={isProductModalOpen}
        mode={productModalMode}
        item={productModalItem}
        isSaving={isSavingProduct}
        onClose={closeProductModal}
        onSubmit={handleSaveProduct}
      />
    </div>
  );
};
