import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { apiRequest } from "../services/api";
import { downloadReceiptPdf } from "../utils/receiptPdf";

const formatLkr = (value: number) => `LKR ${Number(value || 0).toLocaleString()}`;

type CardBrand = "visa" | "mastercard" | "amex";
type DeliveryPaymentOption = "cod" | "prepaid";

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

export const DeliveryCheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, checkout } = useApp();

  const checkoutState = (location.state as { address?: string; flow?: "seller-payment"; paymentOption?: DeliveryPaymentOption } | null) || null;
  const isSellerPaymentFlow = checkoutState?.flow === "seller-payment";
  const initialAddress = String(checkoutState?.address || "");

  const [address, setAddress] = useState(initialAddress);
  const [paymentOption, setPaymentOption] = useState<DeliveryPaymentOption>(checkoutState?.paymentOption || "cod");
  const [cardBrand, setCardBrand] = useState<CardBrand>("visa");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<{ orderId: string; paymentRef: string; total: number } | null>(null);
  const [codSuccessData, setCodSuccessData] = useState<{ orderId: string; total: number } | null>(null);

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.08).toFixed(2));
  const deliveryCharge = isSellerPaymentFlow ? 0 : 500;
  const total = subtotal + tax + deliveryCharge;

  const cardDigits = useMemo(() => cardNumber.replace(/\D/g, "").slice(0, 19), [cardNumber]);
  const cvcDigits = useMemo(() => cvc.replace(/\D/g, "").slice(0, 4), [cvc]);

  const canSubmitCod = address.trim().length > 8;
  const canSubmitPrepaid =
    canSubmitCod && cardHolder.trim().length >= 3 && cardDigits.length >= 12 && isExpiryValid(expiry) && cvcDigits.length >= 3;

  const handleConfirm = async () => {
    if ((paymentOption === "cod" && !canSubmitCod) || (paymentOption === "prepaid" && !canSubmitPrepaid) || state.cart.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const order = (await checkout({
        orderType: isSellerPaymentFlow ? "pickup" : "delivery",
        deliveryAddress: address,
        paymentMethod: paymentOption === "cod" ? "cash" : "card",
      })) as { _id: string; total: number };

      if (paymentOption === "cod") {
        setCodSuccessData({
          orderId: order._id,
          total: order.total,
        });
        return;
      }

      const last4 = cardDigits.slice(-4);
      const paymentResponse = await apiRequest<{ payment: { reference: string } }>("/payments/process", {
        method: "POST",
        body: JSON.stringify({
          orderId: order._id,
          amount: order.total,
          paymentMethod: "card",
          cardBrand,
          cardNumber: last4,
          orderType: isSellerPaymentFlow ? "pickup" : "delivery",
          tableNumber: "",
          deliveryAddress: address,
        }),
      });

      setSuccessData({
        orderId: order._id,
        paymentRef: paymentResponse.payment.reference,
        total: order.total,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadReceipt = () => {
    if (!successData) {
      return;
    }

    downloadReceiptPdf(`receipt-${successData.paymentRef}.pdf`, "Delivery Payment Receipt", [
      { label: "Payment Reference", value: successData.paymentRef },
      { label: "Order ID", value: successData.orderId },
      { label: "Order Type", value: isSellerPaymentFlow ? "Seller Payment" : "Home Delivery" },
      { label: "Delivery Address", value: address || "N/A" },
      { label: "Amount Paid", value: formatLkr(successData.total) },
      { label: "Paid Via", value: `${cardBrand.toUpperCase()} (**** ${cardDigits.slice(-4)})` },
      { label: "Issued At", value: new Date().toLocaleString() },
    ]);
  };

  if (successData || codSuccessData) {
    const isPrepaidSuccess = Boolean(successData);
    const paidReference = successData?.paymentRef || "";
    const confirmedOrderId = successData?.orderId || codSuccessData?.orderId || "";
    const confirmedTotal = Number(successData?.total || codSuccessData?.total || 0);

    return (
      <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
        <motion.div
          className="container mx-auto max-w-2xl bg-[#111] border border-[#2f2f2f] rounded-2xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <CheckCircle2 className="mx-auto text-[#D4AF37] mb-4" size={56} />
          <h1 className="text-3xl font-serif text-white mb-2">{isPrepaidSuccess ? "Payment Successful" : "Order Confirmed"}</h1>
          <p className="text-gray-300 mb-6">
            {isSellerPaymentFlow
              ? isPrepaidSuccess
                ? "Seller prepayment completed successfully."
                : "Seller COD order has been confirmed successfully."
              : isPrepaidSuccess
              ? "Your prepaid delivery order is confirmed."
              : "Your cash on delivery order has been confirmed successfully."}
          </p>
          <div className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm font-semibold">
            {isPrepaidSuccess ? "Payment successfully confirmed." : "Order successfully confirmed."}
          </div>
          <div className="text-left bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 mb-6 space-y-2 text-sm">
            {isPrepaidSuccess && <p>Payment Ref: <span className="text-[#D4AF37]">{paidReference}</span></p>}
            <p>Order ID: {confirmedOrderId}</p>
            <p>{isPrepaidSuccess ? "Total Paid" : "Order Total"}: {formatLkr(confirmedTotal)}</p>
            {!isPrepaidSuccess && <p>Payment Method: COD</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isPrepaidSuccess && (
              <button onClick={downloadReceipt} className="px-5 py-3 rounded-lg bg-[#D4AF37] text-black font-bold inline-flex items-center justify-center gap-2">
                <Download size={16} /> Download Receipt
              </button>
            )}
            {!isSellerPaymentFlow && (
              <button
                onClick={() => navigate(`/orders/${confirmedOrderId}/tracking`, { state: { successMessage: "Order successfully confirmed." } })}
                className="px-5 py-3 rounded-lg border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black inline-flex items-center justify-center gap-2"
              >
                Track Order
              </button>
            )}
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
        <Link to={isSellerPaymentFlow ? "/cart?flow=seller-payment" : "/cart"} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#D4AF37] mb-6">
          <ArrowLeft size={16} /> Back to Cart
        </Link>

        <motion.div
          className="bg-[#111] border border-[#2f2f2f] rounded-2xl p-6 md:p-8"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-3xl font-serif text-white mb-2">{isSellerPaymentFlow ? "Seller Payment Checkout" : "Delivery Checkout"}</h1>
          <p className="text-gray-400 mb-6">
            {isSellerPaymentFlow
              ? "Choose prepayment or COD to complete the seller order flow."
              : "Choose cash on delivery or prepayment and complete your order."}
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">{isSellerPaymentFlow ? "Delivery Address (Required For COD)" : "Delivery Address"}</label>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="w-full min-h-[88px] bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-3 text-white focus:outline-none focus:border-[#D4AF37]"
                placeholder="Enter full address"
              />
            </div>

            {!isSellerPaymentFlow && (
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Payment Option</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentOption("cod")}
                    className={`py-3 rounded-lg border text-sm font-bold ${paymentOption === "cod" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "border-[#3a3a3a] text-gray-300"}`}
                  >
                    COD
                  </button>
                  <button
                    onClick={() => setPaymentOption("prepaid")}
                    className={`py-3 rounded-lg border text-sm font-bold ${paymentOption === "prepaid" ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "border-[#3a3a3a] text-gray-300"}`}
                  >
                    Pre Payment
                  </button>
                </div>
              </div>
            )}
          </div>

          {paymentOption === "prepaid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              <div>
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
          )}

          <div className="rounded-lg border border-[#2b313b] bg-[#0f1319] p-3 text-xs text-gray-300 flex items-start gap-2 mb-5">
            <ShieldCheck size={15} className="text-[#D4AF37] mt-0.5" />
            {isSellerPaymentFlow
              ? "Secure seller checkout enabled. Only masked card information is retained for receipt records."
              : "Secure checkout enabled. Only masked card information is retained for receipt records."}
          </div>

          {errorMessage && <p className="text-sm text-red-300 mb-4">{errorMessage}</p>}

          {paymentOption === "cod" && !canSubmitCod && (
            <p className="text-sm text-amber-300 mb-4">Enter delivery address to continue with COD checkout.</p>
          )}

          <motion.button
            onClick={handleConfirm}
            disabled={
              state.cart.length === 0 ||
              isSubmitting ||
              (paymentOption === "cod" ? !canSubmitCod : !canSubmitPrepaid)
            }
            className="w-full bg-[#D4AF37] text-black py-4 rounded-lg font-bold uppercase tracking-wide disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isSubmitting ? "Processing..." : paymentOption === "cod" ? "Confirm Cash Checkout" : "Confirm Payment"}
          </motion.button>

          <div className="mt-4 text-right">
            <span className="text-gray-400">Total: </span>
            <span className="text-[#D4AF37] text-2xl font-serif">{formatLkr(total)}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
