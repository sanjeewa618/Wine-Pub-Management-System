import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { apiRequest } from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

type CardBrand = "visa" | "mastercard" | "amex";

interface ReservationShape {
  tableLabel?: string;
  bookingReference?: string;
}

const formatLkr = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;

function isExpiryValid(value: string) {
  if (!/^\d{2}\/\d{2}$/.test(value)) {
    return false;
  }

  const [monthRaw, yearRaw] = value.split("/");
  const month = Number(monthRaw);
  const year = Number(`20${yearRaw}`);
  if (month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const expiry = new Date(year, month, 0, 23, 59, 59);
  return expiry >= now;
}

export const PickupCheckoutPage = () => {
  const { state, checkout } = useApp();
  const [tableNumber, setTableNumber] = useState("T1");
  const [cardBrand, setCardBrand] = useState<CardBrand>("visa");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [latestBookingRef, setLatestBookingRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<{ orderId: string; paymentRef: string; total: number } | null>(null);

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = subtotal + tax;

  useEffect(() => {
    let isActive = true;
    const loadReservation = async () => {
      try {
        const response = await apiRequest<{ reservations: ReservationShape[] }>("/reservations");
        if (!isActive || !response.reservations.length) {
          return;
        }

        const latest = response.reservations[0];
        if (latest.tableLabel) {
          setTableNumber(latest.tableLabel);
        }
        if (latest.bookingReference) {
          setLatestBookingRef(latest.bookingReference);
        }
      } catch {
        // Non-blocking: checkout can proceed without reservation metadata.
      }
    };

    void loadReservation();
    return () => {
      isActive = false;
    };
  }, []);

  const cardDigits = useMemo(() => cardNumber.replace(/\D/g, "").slice(0, 19), [cardNumber]);
  const cvcDigits = useMemo(() => cvc.replace(/\D/g, "").slice(0, 4), [cvc]);

  const isFormValid =
    cardHolder.trim().length >= 3 &&
    cardDigits.length >= 12 &&
    isExpiryValid(expiry) &&
    cvcDigits.length >= 3 &&
    tableNumber.trim().length > 0;

  const handleConfirmPayment = async () => {
    if (!isFormValid || state.cart.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const order = (await checkout({
        orderType: "pickup",
        paymentMethod: "card",
        pickupTableNumber: tableNumber,
      })) as { _id: string; total: number };

      const last4 = cardDigits.slice(-4);
      const paymentResponse = await apiRequest<{ payment: { reference: string } }>("/payments/process", {
        method: "POST",
        body: JSON.stringify({
          orderId: order._id,
          amount: order.total,
          paymentMethod: "card",
          cardBrand,
          cardNumber: last4,
          orderType: "pickup",
          tableNumber,
          deliveryAddress: "",
        }),
      });

      setSuccessData({
        orderId: order._id,
        paymentRef: paymentResponse.payment.reference,
        total: order.total,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!successData) {
      return;
    }

    downloadReceiptPdf(`receipt-${successData.paymentRef}.pdf`, "Payment Receipt", [
      { label: "Payment Reference", value: successData.paymentRef },
      { label: "Order ID", value: successData.orderId },
      { label: "Order Type", value: "Pub Pickup" },
      { label: "Table Number", value: tableNumber },
      { label: "Reservation Ref", value: latestBookingRef || "N/A" },
      { label: "Amount Paid", value: formatLkr(successData.total) },
      { label: "Paid Via", value: `${cardBrand.toUpperCase()} (**** ${cardDigits.slice(-4)})` },
      { label: "Issued At", value: new Date().toLocaleString() },
    ]);
  };

  if (successData) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
        <motion.div
          className="container mx-auto max-w-2xl bg-[#111] border border-[#2f2f2f] rounded-2xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <CheckCircle2 className="mx-auto text-[#D4AF37] mb-4" size={56} />
          <h1 className="text-3xl font-serif text-white mb-2">Payment Successful</h1>
          <p className="text-gray-300 mb-6">Your pickup order has been confirmed and payment was processed securely.</p>
          <div className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-semibold">
            Payment successfully confirmed.
          </div>
          <div className="text-left bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 mb-6 space-y-2 text-sm">
            <p>Payment Ref: <span className="text-[#D4AF37]">{successData.paymentRef}</span></p>
            <p>Order ID: {successData.orderId}</p>
            <p>Table Number: {tableNumber}</p>
            <p>Total Paid: {formatLkr(successData.total)}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={downloadReceipt} className="px-5 py-3 rounded-lg bg-[#D4AF37] text-black font-bold inline-flex items-center justify-center gap-2">
              <Download size={16} /> Download Receipt
            </button>
            <Link to="/" className="px-5 py-3 rounded-lg border border-[#3a3a3a] text-white hover:border-[#D4AF37] inline-flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back To Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto max-w-3xl">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#D4AF37] mb-6">
          <ArrowLeft size={16} /> Back to Cart
        </Link>

        <motion.div
          className="bg-[#111] border border-[#2f2f2f] rounded-2xl p-6 md:p-8"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-3xl font-serif text-white mb-2">Pickup Checkout</h1>
          <p className="text-gray-400 mb-6">Select table and enter card details to confirm your payment.</p>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-4 mb-6">
            <p className="text-[#D4AF37] text-sm uppercase tracking-widest mb-2">Order Total</p>
            <p className="text-3xl font-serif">{formatLkr(total)}</p>
            {latestBookingRef && <p className="text-xs text-gray-400 mt-1">Using reservation: {latestBookingRef}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Table Number</label>
              <input
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value.toUpperCase())}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                placeholder="T1"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Card Brand</label>
              <select
                value={cardBrand}
                onChange={(event) => setCardBrand(event.target.value as CardBrand)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Card Holder Name</label>
              <input
                value={cardHolder}
                onChange={(event) => setCardHolder(event.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                placeholder="Name on card"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Card Number</label>
              <input
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="cc-number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">Expiry</label>
                <input
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">CVC</label>
                <input
                  value={cvc}
                  onChange={(event) => setCvc(event.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#2b313b] bg-[#0f1319] p-3 text-xs text-gray-300 flex items-start gap-2 mb-5">
            <ShieldCheck size={15} className="text-[#D4AF37] mt-0.5" />
            Your payment details are validated client-side and only masked card metadata is stored for receipts.
          </div>

          {errorMessage && <p className="text-sm text-red-300 mb-4">{errorMessage}</p>}

          <motion.button
            onClick={handleConfirmPayment}
            disabled={!isFormValid || isSubmitting || state.cart.length === 0}
            className="w-full bg-[#D4AF37] text-black py-4 rounded-lg font-bold uppercase tracking-wide disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isSubmitting ? "Processing..." : "Confirm Payment"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
