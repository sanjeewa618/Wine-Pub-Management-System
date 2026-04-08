import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { apiRequest } from "../services/api";
import { EditableProductItem, ProductEditorModal, ProductEditorMode } from "../components/ProductEditorModal";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadReceiptPdf } from "../utils/receiptPdf";
import { useApp } from "../context/AppContext";

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
  userId:
    | string
    | {
        _id: string;
        name?: string;
        email?: string;
        role?: string;
      };
  items?: Array<{
    name?: string;
    quantity?: number;
    selectedSize?: string;
    brand?: string;
    rating?: number;
    sellerId?: string;
    productId?: {
      _id?: string;
      sellerId?: string | null;
      name?: string;
      productType?: string;
      brand?: string;
      rating?: number;
    };
  }>;
  total: number;
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
  createdAt: string;
  orderType: string;
  paymentMethod?: "card" | "cash" | "other";
  paymentStatus?: "unpaid" | "paid";
  trackingNumber?: string;
}

interface AdminPayment {
  _id: string;
  orderId?: {
    _id?: string;
    trackingNumber?: string;
    orderType?: string;
    status?: string;
    total?: number;
    createdAt?: string;
  };
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  reference: string;
  provider?: string;
  cardBrand?: string;
  cardLast4?: string;
  receiptMeta?: {
    orderType?: string;
    tableNumber?: string;
    deliveryAddress?: string;
  };
  createdAt: string;
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
  productType: "wine" | "arrack" | "whiskey" | "whisky" | "rum" | "vodka" | "beer";
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

interface SellerCatalogItem {
  _id: string;
  name: string;
  productType: string;
  category: string;
  price: number;
  stock: number;
  image?: string;
  description?: string;
  rating?: number;
  sellerId?: string | { _id?: string } | null;
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

const CREATE_ORDER_ITEM_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1514361892635-eae31a3d0f1d?auto=format&fit=crop&q=80&w=300";

export const AdminSectionPage = ({ section, title, subtitle }: AdminSectionPageProps) => {
  const navigate = useNavigate();
  const { addToCart, state, updateProfile, changePassword, toggleTwoFactor } = useApp();
  const data = sectionData[section];
  const defaultReservationTimeSlots = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"];
  const outOfStockSectionRef = useRef<HTMLDivElement | null>(null);
  const outOfStockBitesSectionRef = useRef<HTMLDivElement | null>(null);
  const settingsAvatarInputRef = useRef<HTMLInputElement | null>(null);
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
  const [orderItems, setOrderItems] = useState<AdminOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [paymentItems, setPaymentItems] = useState<AdminPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [ordersChartMode, setOrdersChartMode] = useState<"customer" | "seller">("customer");
  const [isUpdatingOrderId, setIsUpdatingOrderId] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsUsersCount, setAnalyticsUsersCount] = useState(0);
  const [analyticsOrders, setAnalyticsOrders] = useState<AdminOrder[]>([]);
  const [analyticsReservations, setAnalyticsReservations] = useState<AdminReservation[]>([]);
  const [analyticsPayments, setAnalyticsPayments] = useState<AdminPayment[]>([]);
  const [settingsProfileForm, setSettingsProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [settingsPasswordForm, setSettingsPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingSettingsProfile, setIsSavingSettingsProfile] = useState(false);
  const [isSavingSettingsPassword, setIsSavingSettingsPassword] = useState(false);
  const [isSavingTwoFactor, setIsSavingTwoFactor] = useState(false);
  const [settingsProfileMessage, setSettingsProfileMessage] = useState("");
  const [settingsPasswordMessage, setSettingsPasswordMessage] = useState("");
  const [settingsSecurityMessage, setSettingsSecurityMessage] = useState("");
  const [settingsProfileError, setSettingsProfileError] = useState("");
  const [settingsPasswordError, setSettingsPasswordError] = useState("");
  const [settingsSecurityError, setSettingsSecurityError] = useState("");
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isLoadingCreateOrderData, setIsLoadingCreateOrderData] = useState(false);
  const [isAddingCreateOrderToCart, setIsAddingCreateOrderToCart] = useState(false);
  const [createOrderSellers, setCreateOrderSellers] = useState<SellerUser[]>([]);
  const [createOrderItems, setCreateOrderItems] = useState<SellerCatalogItem[]>([]);
  const [selectedCreateOrderSellerId, setSelectedCreateOrderSellerId] = useState<string>("");
  const [selectedCreateOrderQuantities, setSelectedCreateOrderQuantities] = useState<Record<string, number>>({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");

  const isSellersSection = section === "sellers";
  const isUsersSection = section === "users";
  const isReservationsSection = section === "reservations";
  const isWinesSection = section === "wines";
  const isBitesSection = section === "bites";
  const isOrdersSection = section === "orders";
  const isAnalyticsSection = section === "analytics";
  const isSettingsSection = section === "settings";

  const getSellerTypeLabel = (sellerType?: string) => {
    const labels: Record<string, string> = {
      liquor_supplier: "Liquor Supplier",
      restaurant: "Restaurant",
      wine_company: "Wine Supplier",
      beer_company: "Beer Supplier",
      snacks_provider: "Snack Provider",
    };
    return labels[sellerType || ""] || "Seller";
  };

  const getItemSellerId = (item: SellerCatalogItem) => {
    if (!item.sellerId) return "";
    if (typeof item.sellerId === "string") return item.sellerId;
    return String(item.sellerId?._id || "");
  };

  const loadCreateOrderData = async () => {
    setIsLoadingCreateOrderData(true);
    try {
      const [sellersResponse, winesResponse, bitesResponse, sellerProductsResponse] = await Promise.all([
        apiRequest<{ sellers?: SellerUser[] }>("/users/sellers/list"),
        apiRequest<{ items?: SellerCatalogItem[] }>("/wines"),
        apiRequest<{ items?: SellerCatalogItem[] }>("/bites"),
        apiRequest<{ items?: SellerCatalogItem[] }>("/seller-products"),
      ]);

      const activeSellers = (sellersResponse.sellers || []).filter((seller) => seller.status === "active");
      const catalog = [...(winesResponse.items || []), ...(bitesResponse.items || []), ...(sellerProductsResponse.items || [])];

      setCreateOrderSellers(activeSellers);
      setCreateOrderItems(catalog);
      setSelectedCreateOrderSellerId((prev) => prev || activeSellers[0]?._id || "");
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load seller catalog");
    } finally {
      setIsLoadingCreateOrderData(false);
    }
  };

  const openCreateOrderModal = async () => {
    setIsCreateOrderModalOpen(true);
    setSelectedCreateOrderQuantities({});
    await loadCreateOrderData();
  };

  const selectedSellerItems = useMemo(
    () => createOrderItems.filter((item) => getItemSellerId(item) === selectedCreateOrderSellerId),
    [createOrderItems, selectedCreateOrderSellerId]
  );

  const selectedCreateOrderCount = useMemo(
    () => Object.values(selectedCreateOrderQuantities).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [selectedCreateOrderQuantities]
  );

  const handleCreateOrderQuantityChange = (itemId: string, nextQuantity: number, maxStock: number) => {
    const normalized = Math.max(0, Math.min(Number(nextQuantity || 0), Math.max(0, Number(maxStock || 0))));
    setSelectedCreateOrderQuantities((prev) => {
      if (normalized === 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return {
        ...prev,
        [itemId]: normalized,
      };
    });
  };

  const handleAddCreateOrderItemsToCart = async () => {
    const selectedItems = Object.entries(selectedCreateOrderQuantities).filter(([, qty]) => Number(qty) > 0);
    if (selectedItems.length === 0) {
      setFeedbackType("error");
      setFeedbackMessage("Select at least one item quantity before confirming the order.");
      return;
    }

    setIsAddingCreateOrderToCart(true);
    try {
      const selectedPayload = selectedItems
        .map(([itemId, qty]) => {
          const item = createOrderItems.find((entry) => entry._id === itemId);
          if (!item) {
            return null;
          }

          return {
            productId: item._id,
            quantity: Number(qty),
            selectedSize: "",
          };
        })
        .filter((entry): entry is { productId: string; quantity: number; selectedSize: string } => Boolean(entry));

      try {
        await apiRequest("/cart/clear", { method: "POST" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const isRouteMissing = message.toLowerCase().includes("route not found") || message.includes("404");

        if (!isRouteMissing) {
          throw error;
        }

        const existingCart = await apiRequest<{ cart?: { items?: Array<{ productId?: string | { _id?: string }; selectedSize?: string }> } }>("/cart");
        const existingItems = existingCart.cart?.items || [];

        await Promise.all(
          existingItems.map((entry) => {
            const productId =
              typeof entry.productId === "string"
                ? entry.productId
                : String(entry.productId?._id || "");

            if (!productId) return Promise.resolve();

            const sizeQuery = entry.selectedSize ? `?selectedSize=${encodeURIComponent(entry.selectedSize)}` : "";
            return apiRequest(`/cart/items/${productId}${sizeQuery}`, { method: "DELETE" });
          })
        );
      }

      for (const entry of selectedPayload) {
        const item = createOrderItems.find((catalogItem) => catalogItem._id === entry.productId);
        if (!item) {
          continue;
        }

        const normalizedType = ["bite", "food", "beverage"].includes(String(item.productType || "").toLowerCase()) ? "bite" : "wine";

        await addToCart(
          {
            id: item._id,
            name: item.name,
            productType: item.productType,
            type: normalizedType,
            category: item.category || "General",
            price: Number(item.price || 0),
            image: item.image || "",
            rating: Number(item.rating || 0),
            description: item.description || "",
            sellerId: getItemSellerId(item) || undefined,
          },
          "",
          Number(entry.quantity || 1)
        );
      }

      setIsCreateOrderModalOpen(false);
      setSelectedCreateOrderQuantities({});
      setFeedbackType("success");
      setFeedbackMessage("Items moved to cart. Complete payment from checkout to send seller alert.");
      navigate("/cart?flow=seller-payment", {
        state: {
          orderType: "pickup",
          flow: "seller-payment",
          notice: "Items added to cart. Complete payment to send order alert to the seller.",
        },
      });
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to move selected items to cart");
    } finally {
      setIsAddingCreateOrderToCart(false);
    }
  };

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

  const isSellerRelatedOrder = (order: AdminOrder) =>
    (order.items || []).some((item) => Boolean(item?.sellerId || item?.productId?.sellerId));

  const getOrderUserRole = (order: AdminOrder) =>
    typeof order.userId === "object" ? String(order.userId?.role || "").toLowerCase() : "";

  const normalizeOrderStatus = (status: string) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "processing") return "preparing";
    if (normalized === "deliverd") return "delivered";
    if (normalized === "cancleld") return "cancelled";
    return normalized;
  };

  const loadOrdersSectionData = async (options?: { preserveFeedback?: boolean }) => {
    setIsLoadingOrders(true);
    setIsLoadingPayments(true);
    if (!options?.preserveFeedback) {
      setFeedbackMessage("");
    }

    try {
      const [ordersResult, paymentsResult] = await Promise.allSettled([
        apiRequest<{ orders?: AdminOrder[] }>("/orders"),
        apiRequest<{ payments?: AdminPayment[] }>("/payments"),
      ]);

      if (ordersResult.status === "fulfilled") {
        const sortedOrders = [...(ordersResult.value.orders || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrderItems(sortedOrders);
      }

      if (paymentsResult.status === "fulfilled") {
        const sortedPayments = [...(paymentsResult.value.payments || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPaymentItems(sortedPayments);
      }

      if (ordersResult.status === "rejected" && paymentsResult.status === "rejected") {
        throw new Error("Failed to load orders and payments data");
      }

      if (ordersResult.status === "fulfilled" && paymentsResult.status === "rejected") {
        setFeedbackType("error");
        setFeedbackMessage("Orders loaded. Payments endpoint is unavailable right now.");
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load orders data");
    } finally {
      setIsLoadingOrders(false);
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (!isOrdersSection) {
      return;
    }

    void loadOrdersSectionData();
  }, [isOrdersSection]);

  useEffect(() => {
    if (!isOrdersSection) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadOrdersSectionData({ preserveFeedback: true });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isOrdersSection]);

  const loadAnalyticsSectionData = async (options?: { preserveFeedback?: boolean }) => {
    setIsLoadingAnalytics(true);
    if (!options?.preserveFeedback) {
      setFeedbackMessage("");
    }

    try {
      const [usersResult, ordersResult, reservationsResult, paymentsResult] = await Promise.allSettled([
        apiRequest<{ users?: CustomerUser[] }>("/users"),
        apiRequest<{ orders?: AdminOrder[] }>("/orders"),
        apiRequest<{ reservations?: AdminReservation[] }>("/reservations"),
        apiRequest<{ payments?: AdminPayment[] }>("/payments"),
      ]);

      if (usersResult.status === "fulfilled") {
        setAnalyticsUsersCount((usersResult.value.users || []).length);
      }
      if (ordersResult.status === "fulfilled") {
        setAnalyticsOrders(ordersResult.value.orders || []);
      }
      if (reservationsResult.status === "fulfilled") {
        setAnalyticsReservations(reservationsResult.value.reservations || []);
      }
      if (paymentsResult.status === "fulfilled") {
        setAnalyticsPayments(paymentsResult.value.payments || []);
      }

      const hasAtLeastOneSuccess =
        usersResult.status === "fulfilled" ||
        ordersResult.status === "fulfilled" ||
        reservationsResult.status === "fulfilled" ||
        paymentsResult.status === "fulfilled";

      if (!hasAtLeastOneSuccess) {
        throw new Error("Failed to load analytics data");
      }
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to load analytics data");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (!isAnalyticsSection) {
      return;
    }

    void loadAnalyticsSectionData();
  }, [isAnalyticsSection]);

  useEffect(() => {
    if (!isAnalyticsSection) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadAnalyticsSectionData({ preserveFeedback: true });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isAnalyticsSection]);

  useEffect(() => {
    if (!isSettingsSection) {
      return;
    }

    setSettingsProfileForm({
      name: state.user?.name || "",
      email: state.user?.email || "",
      phone: state.user?.phone || "",
      avatar: state.user?.avatar || "",
    });
  }, [isSettingsSection, state.user]);

  const handleSaveSettingsProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsProfileMessage("");
    setSettingsProfileError("");
    setIsSavingSettingsProfile(true);

    try {
      await updateProfile({
        name: settingsProfileForm.name,
        email: settingsProfileForm.email,
        phone: settingsProfileForm.phone,
        avatar: settingsProfileForm.avatar,
      });
      setSettingsProfileMessage("Admin account details updated successfully.");
    } catch (error) {
      setSettingsProfileError(error instanceof Error ? error.message : "Failed to update account details");
    } finally {
      setIsSavingSettingsProfile(false);
    }
  };

  const handleSettingsAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSettingsProfileError("Image must be less than 5MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setSettingsProfileError("Only JPG, PNG, WebP, and GIF files are supported");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingsProfileForm((prev) => ({
        ...prev,
        avatar: String(reader.result || ""),
      }));
      setSettingsProfileError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSettingsAvatarRemove = () => {
    setSettingsProfileForm((prev) => ({
      ...prev,
      avatar: "",
    }));
    setSettingsProfileError("");
  };

  const handleChangeSettingsPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsPasswordMessage("");
    setSettingsPasswordError("");

    if (settingsPasswordForm.newPassword !== settingsPasswordForm.confirmPassword) {
      setSettingsPasswordError("New password and confirm password do not match.");
      return;
    }

    setIsSavingSettingsPassword(true);
    try {
      await changePassword({
        currentPassword: settingsPasswordForm.currentPassword,
        newPassword: settingsPasswordForm.newPassword,
      });
      setSettingsPasswordMessage("Password changed successfully.");
      setSettingsPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setSettingsPasswordError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsSavingSettingsPassword(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    setSettingsSecurityMessage("");
    setSettingsSecurityError("");
    setIsSavingTwoFactor(true);
    try {
      const nextValue = !Boolean(state.user?.twoFactorEnabled);
      await toggleTwoFactor(nextValue);
      setSettingsSecurityMessage(nextValue ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
    } catch (error) {
      setSettingsSecurityError(error instanceof Error ? error.message : "Failed to update 2FA setting");
    } finally {
      setIsSavingTwoFactor(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    const normalizedStatus = normalizeOrderStatus(nextStatus);
    setIsUpdatingOrderId(orderId);

    try {
      await apiRequest(`/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: normalizedStatus }),
      });

      await loadOrdersSectionData({ preserveFeedback: true });
      setFeedbackType("success");
      setFeedbackMessage(`Order status updated to ${normalizedStatus}.`);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setIsUpdatingOrderId(null);
    }
  };

  const handleViewPaymentReceipt = (payment: AdminPayment) => {
    downloadReceiptPdf(`receipt-${payment.reference}.pdf`, "Payment Receipt", [
      { label: "Payment Reference", value: payment.reference || "-" },
      { label: "Date", value: new Date(payment.createdAt).toLocaleString() },
      { label: "Amount", value: `${payment.currency || "LKR"} ${Number(payment.amount || 0).toFixed(2)}` },
      { label: "Payment Method", value: payment.paymentMethod || "-" },
      { label: "Status", value: payment.status || "-" },
      { label: "Customer", value: payment.userId?.name || payment.userId?.email || "-" },
      { label: "Order Type", value: payment.orderId?.orderType || payment.receiptMeta?.orderType || "-" },
      { label: "Tracking Number", value: payment.orderId?.trackingNumber || "-" },
      { label: "Table Number", value: payment.receiptMeta?.tableNumber || "-" },
      { label: "Delivery Address", value: payment.receiptMeta?.deliveryAddress || "-" },
      { label: "Card", value: payment.cardLast4 ? `${payment.cardBrand || "CARD"} •••• ${payment.cardLast4}` : "-" },
    ]);
  };

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
      { label: "Total Number Of Liquours", value: String(totalLiquors), delta: "arrack, wine, beer, whiskey, rum, vodka" },
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

  const ordersByType = useMemo(() => {
    const customerOrders = orderItems.filter((order) => {
      const role = getOrderUserRole(order);
      if (role === "customer") return true;
      if (role === "seller" || role === "admin") return false;
      // Fallback for older/unpopulated records: treat non-seller-related orders as customer orders.
      return !isSellerRelatedOrder(order);
    });

    const sellerOrders = orderItems.filter((order) => {
      const role = getOrderUserRole(order);
      const sellerRelated = isSellerRelatedOrder(order);
      // "Orders to sellers" are operational purchase orders initiated by admin.
      // Keep fallback for records where user role is not populated.
      return sellerRelated && (role === "admin" || !role);
    });
    return { customerOrders, sellerOrders };
  }, [orderItems]);

  const pendingStatuses = new Set(["pending", "confirmed", "preparing", "ready"]);

  const sellerRequestRating = useMemo(() => {
    const ratings = ordersByType.sellerOrders
      .map((order) => Number((order as unknown as { sellerRating?: number }).sellerRating || 0))
      .filter((rating) => Number.isFinite(rating) && rating > 0);

    if (ratings.length === 0) {
      return "0.0";
    }

    return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
  }, [ordersByType.sellerOrders]);

  const ordersKpis = useMemo(() => {
    if (!isOrdersSection) {
      return data.kpis;
    }

    const pendingSellerRequests = ordersByType.sellerOrders.filter((order) => normalizeOrderStatus(order.status) === "pending").length;
    const totalSellerRequests = ordersByType.sellerOrders.length;

    return [
      {
        label: "Total Orders",
        value: String(totalSellerRequests),
        delta: "Admin requests sent to sellers",
      },
      {
        label: "Pending Orders",
        value: String(pendingSellerRequests),
        delta: "Waiting for seller confirmation",
      },
      {
        label: "Rating",
        value: sellerRequestRating,
        delta: "Average rating across requested items",
      },
    ];
  }, [data.kpis, isOrdersSection, ordersByType.sellerOrders, sellerRequestRating]);

  const analyticsKpis = useMemo(() => {
    const revenue = analyticsOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const completedPayments = analyticsPayments.filter((payment) => String(payment.status || "").toLowerCase() === "completed").length;

    return [
      {
        label: "Total Revenue",
        value: `LKR ${Math.round(revenue).toLocaleString()}`,
        delta: `${analyticsOrders.length} orders`,
      },
      {
        label: "Users + Reservations",
        value: `${analyticsUsersCount + analyticsReservations.length}`,
        delta: `${analyticsUsersCount} users · ${analyticsReservations.length} reservations`,
      },
      {
        label: "Completed Payments",
        value: String(completedPayments),
        delta: `${analyticsPayments.length} total payments`,
      },
    ];
  }, [analyticsOrders, analyticsPayments, analyticsReservations.length, analyticsUsersCount]);

  const analyticsRevenueTrendData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values = [0, 0, 0, 0, 0, 0, 0];

    analyticsOrders.forEach((order) => {
      const day = new Date(order.createdAt).getDay();
      const mondayIndex = (day + 6) % 7;
      values[mondayIndex] += Number(order.total || 0);
    });

    return labels.map((label, index) => ({
      label,
      revenue: Math.round(values[index]),
    }));
  }, [analyticsOrders]);

  const analyticsOrderStatusData = useMemo(() => {
    const counts = {
      pending: 0,
      preparing: 0,
      delivered: 0,
      cancelled: 0,
    };

    analyticsOrders.forEach((order) => {
      const status = normalizeOrderStatus(order.status);
      if (status === "pending") counts.pending += 1;
      if (status === "preparing" || status === "confirmed" || status === "ready") counts.preparing += 1;
      if (status === "delivered") counts.delivered += 1;
      if (status === "cancelled") counts.cancelled += 1;
    });

    return [
      { label: "Pending", count: counts.pending },
      { label: "Preparing", count: counts.preparing },
      { label: "Delivered", count: counts.delivered },
      { label: "Cancelled", count: counts.cancelled },
    ];
  }, [analyticsOrders]);

  const analyticsPaymentMethodData = useMemo(() => {
    const counts = {
      card: 0,
      cash: 0,
      other: 0,
    };

    analyticsPayments.forEach((payment) => {
      const method = String(payment.paymentMethod || "other").toLowerCase();
      if (method === "card") counts.card += 1;
      else if (method === "cash") counts.cash += 1;
      else counts.other += 1;
    });

    return [
      { label: "Card", count: counts.card },
      { label: "Cash", count: counts.cash },
      { label: "Other", count: counts.other },
    ];
  }, [analyticsPayments]);

  const settingsKpis = useMemo(
    () => [
      {
        label: "Account Status",
        value: String(state.user?.status || "active").toUpperCase(),
        delta: "Live profile state",
      },
      {
        label: "2FA",
        value: state.user?.twoFactorEnabled ? "ENABLED" : "DISABLED",
        delta: "Security layer",
      },
      {
        label: "Role",
        value: String(state.user?.role || "admin").toUpperCase(),
        delta: "Access control",
      },
    ],
    [state.user?.role, state.user?.status, state.user?.twoFactorEnabled]
  );

  const recentOrderActivities = useMemo(() => {
    return [...orderItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 18)
      .map((order) => {
      const customerName = typeof order.userId === "object" ? order.userId?.name || order.userId?.email || "Customer" : "Customer";
      const kind = isSellerRelatedOrder(order) ? "Seller-related order" : "Customer order";
      const firstItem = order.items?.[0];
      const itemSummary = firstItem
        ? `${firstItem.name || "Item"}${firstItem.brand ? ` · ${firstItem.brand}` : ""} x${Number(firstItem.quantity || 0)}`
        : "No item details";
      return {
        id: order._id,
        title: `${kind} · ${order.status}`,
        detail: `${customerName} · ${order.orderType} · ${itemSummary} · ${String(order.paymentMethod || "other").toUpperCase()} · LKR ${Number(order.total || 0).toFixed(2)}`,
        time: new Date(order.createdAt).getTime(),
      };
      });
  }, [orderItems]);

  const weeklyOrderChartData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const source = ordersChartMode === "customer" ? ordersByType.customerOrders : ordersByType.sellerOrders;
    const counts = [0, 0, 0, 0, 0, 0, 0];

    source.forEach((order) => {
      const day = new Date(order.createdAt).getDay();
      const mondayIndex = (day + 6) % 7;
      counts[mondayIndex] += 1;
    });

    return labels.map((label, index) => ({
      label,
      orders: counts[index],
    }));
  }, [ordersByType.customerOrders, ordersByType.sellerOrders, ordersChartMode]);

  const customerPayments = useMemo(() => {
    const sellerOrderIds = new Set(ordersByType.sellerOrders.map((order) => String(order._id || "")));
    return paymentItems.filter((payment) => {
      const paymentOrderId = String(payment.orderId?._id || "");
      return !sellerOrderIds.has(paymentOrderId);
    });
  }, [ordersByType.sellerOrders, paymentItems]);

  const sellerPayments = useMemo(() => {
    const sellerOrderIds = new Set(ordersByType.sellerOrders.map((order) => String(order._id || "")));
    return paymentItems.filter((payment) => {
      const paymentOrderId = String(payment.orderId?._id || "");
      return sellerOrderIds.has(paymentOrderId);
    });
  }, [ordersByType.sellerOrders, paymentItems]);

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
        ) : isOrdersSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadOrdersSectionData()}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Refresh Orders
            </button>
            <button
              onClick={() => void openCreateOrderModal()}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] transition-colors"
            >
              Create Order
            </button>
          </div>
        ) : isAnalyticsSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadAnalyticsSectionData()}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Refresh Analytics
            </button>
          </div>
        ) : isSettingsSection ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSettingsProfileMessage("");
                setSettingsPasswordMessage("");
                setSettingsSecurityMessage("");
                setSettingsProfileError("");
                setSettingsPasswordError("");
                setSettingsSecurityError("");
              }}
              className="px-4 py-2 rounded-lg border border-[#2a2a2a] bg-[#161616] text-xs font-semibold text-[#D4AF37] hover:text-white hover:border-[#D4AF37]/60 transition-colors"
            >
              Clear Messages
            </button>
          </div>
        ) : !isUsersSection && (
          <button className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c39b22] transition-colors w-fit">
            {data.actionLabel}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(isUsersSection
          ? usersKpis
          : isReservationsSection
          ? reservationKpis
          : isWinesSection
          ? winesKpis
          : isBitesSection
          ? bitesKpis
          : isOrdersSection
          ? ordersKpis
          : isAnalyticsSection
          ? analyticsKpis
          : isSettingsSection
          ? settingsKpis
          : sellersKpis
        ).map((item) => (
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
      ) : isOrdersSection ? (
        <div className="space-y-6">
          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">Payment Details</h2>
              <span className="text-xs text-gray-400">Customer and seller-related paid orders</span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Customer Orders Payments</h3>
                <div
                  className="space-y-2 max-h-[240px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
                >
                  {isLoadingPayments && customerPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">Loading payments...</p>
                  ) : customerPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">No payment records found.</p>
                  ) : (
                    customerPayments.slice(0, 20).map((payment) => (
                      <div key={payment._id} className="rounded border border-[#2a2a2a] bg-[#111] p-2">
                        <p className="text-xs text-white font-semibold">{payment.reference}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {(payment.currency || "LKR")} {Number(payment.amount || 0).toFixed(2)} · {payment.paymentMethod || "-"}
                        </p>
                        <button
                          onClick={() => handleViewPaymentReceipt(payment)}
                          className="mt-2 rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                        >
                          View Receipt
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Orders To Sellers Payments</h3>
                <div
                  className="space-y-2 max-h-[240px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
                >
                  {isLoadingPayments && sellerPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">Loading payments...</p>
                  ) : sellerPayments.length === 0 ? (
                    <p className="text-xs text-gray-400">No seller-related payment records found.</p>
                  ) : (
                    sellerPayments.slice(0, 20).map((payment) => (
                      <div key={payment._id} className="rounded border border-[#2a2a2a] bg-[#111] p-2">
                        <p className="text-xs text-white font-semibold">{payment.reference}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {(payment.currency || "LKR")} {Number(payment.amount || 0).toFixed(2)} · {payment.paymentMethod || "-"}
                        </p>
                        <button
                          onClick={() => handleViewPaymentReceipt(payment)}
                          className="mt-2 rounded-md border border-[#D4AF37]/45 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
                        >
                          View Receipt
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-white text-lg font-bold">Weekly Orders Analysis</h2>
                <select
                  value={ordersChartMode}
                  onChange={(event) => setOrdersChartMode(event.target.value as "customer" | "seller")}
                  className="rounded border border-[#2a2a2a] bg-[#161616] px-2 py-1 text-xs text-gray-200"
                >
                  <option value="customer">Customer's Orders</option>
                  <option value="seller">Seller's Orders</option>
                </select>
              </div>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyOrderChartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersLineGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      label={{ value: "Week Days", position: "insideBottom", offset: -6, fill: "#9ca3af", fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      allowDecimals={false}
                      label={{ value: "Orders Count", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(212,175,55,0.08)" }}
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#D4AF37"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: "#D4AF37", fill: "#0f0f0f" }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#D4AF37", fill: "#D4AF37" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="url(#ordersLineGlow)"
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
              <h2 className="text-white text-lg font-bold mb-4">Recent Orders Activities</h2>
              <div
                className="space-y-3 max-h-[320px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {isLoadingOrders && recentOrderActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">Loading recent activities...</p>
                ) : recentOrderActivities.length === 0 ? (
                  <p className="text-sm text-gray-400">No order activities found.</p>
                ) : (
                  recentOrderActivities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                      <p className="text-sm text-white font-semibold">{activity.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.detail}</p>
                      <p className="text-xs text-[#D4AF37] mt-1">{new Date(activity.time).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-4">Customer Order Status Tracker</h2>
              <div
                className="space-y-3 max-h-[620px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#D4AF37 #1a1a1a" }}
              >
                {ordersByType.customerOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">No customer orders found.</p>
                ) : (
                  ordersByType.customerOrders.slice(0, 30).map((order) => {
                    const customerName = typeof order.userId === "object" ? order.userId?.name || order.userId?.email || "Customer" : "Customer";
                    return (
                      <div key={order._id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3">
                        <p className="text-sm text-white font-semibold">{customerName}</p>
                        <p className="text-xs text-gray-400 mt-1">{order.orderType} · {new Date(order.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-[#D4AF37] mt-1">Tracking: {order.trackingNumber || "N/A"}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-gray-300">Status:</span>
                          <select
                            value={order.status}
                            disabled={isUpdatingOrderId === order._id}
                            onChange={(event) => void handleUpdateOrderStatus(order._id, event.target.value)}
                            className="flex-1 rounded border border-[#2a2a2a] bg-[#111] px-2 py-1 text-xs text-gray-200"
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
          </div>
        </div>
      ) : isAnalyticsSection ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-4">Revenue Overview (Live)</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsRevenueTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(212,175,55,0.08)" }}
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, fill: "#D4AF37" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-4">Order Status Distribution</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsOrderStatusData}>
                    <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(212,175,55,0.08)" }}
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#D4AF37" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-4">Payment Methods Trend</h2>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsPaymentMethodData}>
                    <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(212,175,55,0.08)" }}
                      contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#b89328" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="xl:col-span-2 bg-[#111] border border-[#333] rounded-xl p-6">
              <h2 className="text-white text-lg font-bold mb-4">Live Analytics Status</h2>
              <div className="space-y-3">
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 text-sm text-gray-300">
                  Auto refresh: every 10 seconds
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 text-sm text-gray-300">
                  Users tracked: {analyticsUsersCount}
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 text-sm text-gray-300">
                  Orders tracked: {analyticsOrders.length}
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 text-sm text-gray-300">
                  Payments tracked: {analyticsPayments.length}
                </div>
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-3 text-sm text-gray-300">
                  Reservations tracked: {analyticsReservations.length}
                </div>
                {isLoadingAnalytics && <p className="text-xs text-gray-400">Refreshing analytics...</p>}
              </div>
            </div>
          </div>
        </div>
      ) : isSettingsSection ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
              <h2 className="text-xl font-semibold text-white">Admin Account Details</h2>
              <p className="mt-2 text-xs text-gray-400">Update admin profile details used across notifications and approvals.</p>

              <form className="mt-5 space-y-4" onSubmit={handleSaveSettingsProfile}>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Profile Image</label>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => settingsAvatarInputRef.current?.click()}
                      className="relative h-20 w-20 rounded-full border-2 border-[#D4AF37] bg-[#171717] hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={
                          settingsProfileForm.avatar ||
                          "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=300"
                        }
                        alt="Admin profile preview"
                        className="h-full w-full rounded-full object-cover"
                      />
                      <span className="absolute inset-0 rounded-full bg-black/35 opacity-0 hover:opacity-100 text-xs font-semibold text-white flex items-center justify-center">
                        Change
                      </span>
                    </button>

                    <input
                      ref={settingsAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSettingsAvatarUpload}
                      className="hidden"
                    />

                    {settingsProfileForm.avatar && (
                      <button
                        type="button"
                        onClick={handleSettingsAvatarRemove}
                        className="w-fit rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</label>
                  <input
                    value={settingsProfileForm.name}
                    onChange={(event) => setSettingsProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
                  <input
                    type="email"
                    value={settingsProfileForm.email}
                    onChange={(event) => setSettingsProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</label>
                  <input
                    value={settingsProfileForm.phone}
                    onChange={(event) => setSettingsProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    placeholder="+9477xxxxxxx"
                  />
                </div>

                {settingsProfileMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-700/10 p-3 text-sm text-emerald-200">{settingsProfileMessage}</p>}
                {settingsProfileError && <p className="rounded-lg border border-red-500/40 bg-red-700/10 p-3 text-sm text-red-200">{settingsProfileError}</p>}

                <button
                  type="submit"
                  disabled={isSavingSettingsProfile}
                  className="rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#b6952f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingSettingsProfile ? "Saving..." : "Save Account Details"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-[#333] bg-[#111] p-6">
              <h2 className="text-xl font-semibold text-white">Security Settings</h2>
              <p className="mt-2 text-xs text-gray-400">Manage password and two-factor authentication for admin account security.</p>

              <form className="mt-5 space-y-4" onSubmit={handleChangeSettingsPassword}>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Current Password</label>
                  <input
                    type="password"
                    value={settingsPasswordForm.currentPassword}
                    onChange={(event) => setSettingsPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">New Password</label>
                  <input
                    type="password"
                    value={settingsPasswordForm.newPassword}
                    onChange={(event) => setSettingsPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm New Password</label>
                  <input
                    type="password"
                    value={settingsPasswordForm.confirmPassword}
                    onChange={(event) => setSettingsPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    className="w-full rounded-lg border border-[#333] bg-[#171717] px-3 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                    required
                  />
                </div>

                {settingsPasswordMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-700/10 p-3 text-sm text-emerald-200">{settingsPasswordMessage}</p>}
                {settingsPasswordError && <p className="rounded-lg border border-red-500/40 bg-red-700/10 p-3 text-sm text-red-200">{settingsPasswordError}</p>}

                <button
                  type="submit"
                  disabled={isSavingSettingsPassword}
                  className="rounded-lg border border-[#D4AF37] bg-[#171717] px-4 py-2.5 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#252018] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingSettingsPassword ? "Updating..." : "Change Password"}
                </button>
              </form>

              <div className="mt-6 rounded-lg border border-[#2a2a2a] bg-[#151515] p-4">
                <p className="text-sm text-white font-semibold mb-1">Two-Factor Authentication</p>
                <p className="text-xs text-gray-400 mb-3">
                  Current status: {state.user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                </p>
                {settingsSecurityMessage && <p className="rounded-lg border border-emerald-500/40 bg-emerald-700/10 p-3 text-sm text-emerald-200 mb-3">{settingsSecurityMessage}</p>}
                {settingsSecurityError && <p className="rounded-lg border border-red-500/40 bg-red-700/10 p-3 text-sm text-red-200 mb-3">{settingsSecurityError}</p>}
                <button
                  onClick={() => void handleToggleTwoFactor()}
                  disabled={isSavingTwoFactor}
                  className="rounded-lg border border-[#D4AF37] bg-[#171717] px-4 py-2.5 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#252018] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingTwoFactor
                    ? "Saving..."
                    : state.user?.twoFactorEnabled
                    ? "Disable 2FA"
                    : "Enable 2FA"}
                </button>
              </div>
            </section>
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

      {isCreateOrderModalOpen && isOrdersSection && (
        <div className="fixed inset-0 z-[86] bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-6xl rounded-2xl border border-[#363636] bg-[#121212] p-5 md:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Seller Order</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Select a registered seller, choose items with quantity, then confirm the order request.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOrderModalOpen(false)}
                className="rounded-md border border-[#3c3c3c] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#D4AF37]/60 transition-colors"
              >
                Close
              </button>
            </div>

            {isLoadingCreateOrderData ? (
              <p className="text-sm text-gray-400">Loading sellers and catalog...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4 lg:col-span-1">
                  <h4 className="text-sm font-semibold text-white mb-3">Registered Sellers</h4>
                  <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]">
                    {createOrderSellers.length === 0 ? (
                      <p className="text-xs text-gray-400">No active sellers found.</p>
                    ) : (
                      createOrderSellers.map((seller) => (
                        <button
                          key={seller._id}
                          onClick={() => setSelectedCreateOrderSellerId(seller._id)}
                          className={`w-full text-left rounded-lg border p-3 transition-colors ${
                            selectedCreateOrderSellerId === seller._id
                              ? "border-[#D4AF37]/70 bg-[#D4AF37]/10"
                              : "border-[#2f2f2f] bg-[#101010] hover:border-[#D4AF37]/40"
                          }`}
                        >
                          <p className="text-sm text-white font-semibold">{seller.name}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{getSellerTypeLabel(seller.sellerType)} · {seller.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-4 lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Seller Items With Quantity</h4>
                    <span className="text-xs text-[#D4AF37] font-semibold">Selected Qty: {selectedCreateOrderCount}</span>
                  </div>
                  <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#D4AF37]/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-[#D4AF37]">
                    {selectedCreateOrderSellerId === "" ? (
                      <p className="text-xs text-gray-400">Select a seller to view available items.</p>
                    ) : selectedSellerItems.length === 0 ? (
                      <p className="text-xs text-gray-400">No items found for selected seller.</p>
                    ) : (
                      selectedSellerItems.map((item) => {
                        const selectedQty = Number(selectedCreateOrderQuantities[item._id] || 0);
                        const stock = Math.max(0, Number(item.stock || 0));
                        const itemImage = String(item.image || "").trim() || CREATE_ORDER_ITEM_FALLBACK_IMAGE;
                        return (
                          <div key={item._id} className="rounded-lg border border-[#2f2f2f] bg-[#101010] p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex items-center gap-3">
                              <img
                                src={itemImage}
                                alt={item.name}
                                onError={(event) => {
                                  const target = event.currentTarget;
                                  target.onerror = null;
                                  target.src = CREATE_ORDER_ITEM_FALLBACK_IMAGE;
                                }}
                                className="h-14 w-14 rounded-lg object-cover border border-[#2f2f2f]"
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-white font-semibold truncate">{item.name}</p>
                                <p className="text-[11px] text-gray-400 mt-1 uppercase">{item.productType} · {item.category}</p>
                                <p className="text-[11px] text-[#D4AF37] mt-1">LKR {Number(item.price || 0).toFixed(2)} · Stock {stock}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleCreateOrderQuantityChange(item._id, selectedQty - 1, stock)}
                                className="h-8 w-8 rounded border border-[#3a3a3a] text-gray-300 hover:text-white hover:border-[#D4AF37]/60"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={stock}
                                value={selectedQty}
                                onChange={(event) => handleCreateOrderQuantityChange(item._id, Number(event.target.value || 0), stock)}
                                className="w-16 rounded border border-[#3a3a3a] bg-[#161616] px-2 py-1 text-center text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                              <button
                                onClick={() => handleCreateOrderQuantityChange(item._id, selectedQty + 1, stock)}
                                className="h-8 w-8 rounded border border-[#3a3a3a] text-gray-300 hover:text-white hover:border-[#D4AF37]/60"
                                disabled={selectedQty >= stock}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => void handleAddCreateOrderItemsToCart()}
                      disabled={isAddingCreateOrderToCart || selectedCreateOrderCount === 0}
                      className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c39b22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAddingCreateOrderToCart ? "Confirming..." : "Confirm Order"}
                    </button>
                  </div>
                </div>
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
