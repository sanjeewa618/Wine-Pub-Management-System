import React from "react";
import { Navigate, createBrowserRouter, Outlet } from "react-router";
import { AppProvider, Role, useApp } from "./context/AppContext";
import { MainLayout } from "./layouts/MainLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";

import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { WinesPage } from "./pages/WinesPage";
import { BitesPage } from "./pages/BitesPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { CartPage } from "./pages/CartPage";
import { PickupCheckoutPage } from "./pages/PickupCheckoutPage";
import { DeliveryCheckoutPage } from "./pages/DeliveryCheckoutPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminSectionPage } from "./pages/AdminSectionPage";
import { SellerDashboard } from "./pages/SellerDashboard";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { CustomerReservationsPage } from "./pages/CustomerReservationsPage";
import { CustomerOrderHistoryPage } from "./pages/CustomerOrderHistoryPage";
import { CustomerSettingsPage } from "./pages/CustomerSettingsPage";

// Root component that provides the context
const Root = () => {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { state, isAuthResolved } = useApp();

  if (!isAuthResolved) {
    return <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center">Checking session...</div>;
  }

  if (!state.user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return <>{children}</>;
};

const RoleRoute = ({ allowedRoles, children }: { allowedRoles: Role[]; children: React.ReactNode }) => {
  const { state } = useApp();

  if (!state.user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (!allowedRoles.includes(state.user.role)) {
    if (state.user.role === "admin") return <Navigate to="/admin" replace />;
    if (state.user.role === "seller") return <Navigate to="/seller" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AuthRoute = () => {
  const { state, isAuthResolved } = useApp();

  if (!isAuthResolved) {
    return <div className="min-h-screen bg-[#090909] text-white flex items-center justify-center">Checking session...</div>;
  }

  if (state.user?.role === "admin") return <Navigate to="/admin" replace />;
  if (state.user?.role === "seller") return <Navigate to="/seller" replace />;
  if (state.user?.role === "customer") return <Navigate to="/" replace />;

  return <AuthPage />;
};

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <LandingPage /> },
          { path: "wines", element: <WinesPage /> },
          { path: "reservations", element: <ReservationsPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "checkout/pickup", element: <PickupCheckoutPage /> },
          { path: "checkout/delivery", element: <DeliveryCheckoutPage /> },
          { path: "orders/:orderId/tracking", element: <OrderTrackingPage /> },
          { path: "bites", element: <BitesPage /> },
          { path: "about", element: <div className="pt-32 pb-24 text-center min-h-screen text-white"><h1 className="text-4xl font-serif text-[#D4AF37]">About Us</h1></div> },
          { path: "contact", element: <div className="pt-32 pb-24 text-center min-h-screen text-white"><h1 className="text-4xl font-serif text-[#D4AF37]">Contact Us</h1></div> },
        ],
      },
      {
        path: "/auth",
        element: <AuthRoute />,
      },
      {
        path: "/admin",
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={["admin"]}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          {
            path: "users",
            element: <AdminSectionPage section="users" title="Users" subtitle="Manage customer and admin user accounts." />,
          },
          {
            path: "sellers",
            element: <AdminSectionPage section="sellers" title="Sellers" subtitle="Review, approve, and manage seller accounts." />,
          },
          {
            path: "reservations",
            element: <AdminSectionPage section="reservations" title="Reservations" subtitle="View and manage all reservation records." />,
          },
          {
            path: "wines",
            element: <AdminSectionPage section="wines" title="Wines" subtitle="Manage wine catalog, pricing, and stock availability." />,
          },
          {
            path: "bites",
            element: <AdminSectionPage section="bites" title="Bites Menu" subtitle="Control bites menu items and availability." />,
          },
          {
            path: "orders",
            element: <AdminSectionPage section="orders" title="Orders" subtitle="Track and update all order workflows." />,
          },
          {
            path: "analytics",
            element: <AdminSectionPage section="analytics" title="Analytics" subtitle="Monitor business KPIs and performance metrics." />,
          },
          {
            path: "settings",
            element: <AdminSectionPage section="settings" title="Settings" subtitle="Configure system-wide admin preferences." />,
          },
          { path: "*", element: <div className="flex items-center justify-center h-full text-gray-400">Page Not Found</div> }
        ]
      },
      {
        path: "/seller",
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={["seller"]}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <SellerDashboard /> },
          { path: "*", element: <div className="flex items-center justify-center h-full text-gray-400">Page Under Construction</div> }
        ]
      },
      {
        path: "/customer",
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={["customer"]}>
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <CustomerDashboard /> },
          { path: "reservations", element: <CustomerReservationsPage /> },
          { path: "orders", element: <CustomerOrderHistoryPage /> },
          { path: "settings", element: <CustomerSettingsPage /> },
          { path: "*", element: <div className="flex items-center justify-center h-full text-gray-400">Page Not Found</div> }
        ]
      }
    ]
  }
]);
