import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { motion } from "motion/react";
import { apiRequest } from "../services/api";

const ORDER_STEPS = ["pending", "confirmed", "preparing", "ready", "delivered"];

export const OrderTrackingPage = () => {
  const location = useLocation();
  const { orderId } = useParams();
  const [status, setStatus] = useState("pending");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const fetchTracking = async () => {
      if (!orderId) {
        setErrorMessage("Missing order id");
        return;
      }

      try {
        const response = await apiRequest<{ status: string; trackingNumber: string }>(`/orders/${orderId}/tracks`);
        if (!isActive) {
          return;
        }

        setStatus(response.status || "pending");
        setTrackingNumber(response.trackingNumber || "");
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to track order");
        }
      }
    };

    void fetchTracking();
    return () => {
      isActive = false;
    };
  }, [orderId]);

  const currentStep = useMemo(() => Math.max(ORDER_STEPS.indexOf(status), 0), [status]);
  const successMessage =
    typeof location.state === "object" && location.state && "successMessage" in location.state
      ? String((location.state as { successMessage?: string }).successMessage || "")
      : "";

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          className="bg-[#111] border border-[#2f2f2f] rounded-2xl p-6 md:p-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <PackageCheck className="text-[#D4AF37]" size={28} />
            <h1 className="text-3xl font-serif text-white">Delivery Tracking</h1>
          </div>

          {successMessage && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-semibold">
              {successMessage}
            </div>
          )}

          {trackingNumber && <p className="text-sm text-gray-300 mb-6">Tracking Number: <span className="text-[#D4AF37]">{trackingNumber}</span></p>}
          {errorMessage && <p className="text-sm text-red-300 mb-4">{errorMessage}</p>}

          <div className="space-y-3 mb-8">
            {ORDER_STEPS.map((step, index) => {
              const completed = index <= currentStep;
              return (
                <div key={step} className={`rounded-lg border px-4 py-3 ${completed ? "border-[#D4AF37] bg-[#1a1710]" : "border-[#333] bg-[#0f0f0f]"}`}>
                  <p className={`text-sm uppercase tracking-wider font-bold ${completed ? "text-[#D4AF37]" : "text-gray-500"}`}>{step}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/cart" className="px-5 py-3 rounded-lg border border-[#3a3a3a] text-white hover:border-[#D4AF37] inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Cart
            </Link>
            <Link to="/" className="px-5 py-3 rounded-lg bg-[#D4AF37] text-black font-bold inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back To Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
