import React, { useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Clock, Users, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { apiRequest } from "../services/api";

export const ReservationsPage = () => {
  const { createReservation } = useApp();
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [bookingReference, setBookingReference] = useState("VN-8429X");
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    guests: "2",
    tableNumbers: [] as string[],
    name: "",
    email: "",
    phone: "",
    requests: ""
  });
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const timeSlots = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];

  const fetchAvailability = async (date: string, time: string) => {
    if (!date || !time) {
      setAvailableTables([]);
      setFormData((prev) => ({ ...prev, tableNumbers: [] }));
      setAvailabilityError("");
      return;
    }

    setIsLoadingTables(true);
    setAvailabilityError("");
    try {
      const response = await apiRequest<{ availableTables: string[] }>(
        `/reservations/availability?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
      );

      const tables = response.availableTables ?? [];
      setAvailableTables(tables);
      setFormData((prev) => ({
        ...prev,
        tableNumbers: prev.tableNumbers.filter((table) => tables.includes(table)),
      }));
    } catch (error) {
      setAvailableTables([]);
      setFormData((prev) => ({ ...prev, tableNumbers: [] }));
      setAvailabilityError(error instanceof Error ? error.message : "Unable to load table availability");
    } finally {
      setIsLoadingTables(false);
    }
  };

  const toggleTableSelection = (tableLabel: string) => {
    setFormData((prev) => {
      const selected = prev.tableNumbers;

      if (selected.includes(tableLabel)) {
        return { ...prev, tableNumbers: selected.filter((table) => table !== tableLabel) };
      }

      if (selected.length >= 2) {
        return prev;
      }

      return { ...prev, tableNumbers: [...selected, tableLabel] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const reservation = await createReservation({
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        tableNumbers: formData.tableNumbers,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        requests: formData.requests,
      });

      if (reservation && typeof reservation === "object" && "bookingReference" in reservation) {
        setBookingReference(String((reservation as { bookingReference?: string }).bookingReference ?? "VN-8429X"));
      }

      setStep(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reservation failed");
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-100 pt-32 pb-24 px-4 md:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-serif text-white font-bold mb-4">Reserve Your Table</h1>
          <p className="text-gray-400 text-lg font-light leading-relaxed max-w-2xl mx-auto">
            Experience an unforgettable evening of premium wines and exquisite dining in our luxurious pub.
          </p>
        </div>

        <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 z-0 opacity-10">
            <img src="https://images.unsplash.com/photo-1581957829401-51a7f9d76c88?auto=format&fit=crop&q=80&w=1200" alt="Background" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10 p-8 md:p-12">
            {/* Progress Steps */}
            <div className="flex justify-between items-center mb-12 relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-[#333] -z-10 -translate-y-1/2"></div>
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                    step >= s ? "bg-[#D4AF37] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.6)]" : "bg-[#111] border-[#333] text-gray-500"
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <h2 className="text-2xl font-serif text-[#D4AF37] font-bold mb-6">Reservation Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <CalendarDays size={16} className="mr-2 text-[#D4AF37]" /> Date
                    </label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setFormData((prev) => ({ ...prev, date: nextDate }));
                        void fetchAvailability(nextDate, formData.time);
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:border-[#D4AF37] transition-colors [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      <Users size={16} className="mr-2 text-[#D4AF37]" /> Number of Guests
                    </label>
                    <select 
                      value={formData.guests}
                      onChange={(e) => setFormData({...formData, guests: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg appearance-none focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guests</option>)}
                      <option value="9+">9+ Guests (Contact us)</option>
                    </select>
                  </div>

                </div>

                <div className="space-y-4">
                  <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <Clock size={16} className="mr-2 text-[#D4AF37]" /> Time Slot
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, time }));
                          void fetchAvailability(formData.date, time);
                        }}
                        className={`py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                          formData.time === time 
                            ? "bg-[#D4AF37] text-black border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
                            : "bg-[#1a1a1a] border border-[#333] text-gray-400 hover:border-[#D4AF37]/50 hover:text-white"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <Users size={16} className="mr-2 text-[#D4AF37]" /> Preferred Tables (Max 2)
                  </label>
                  {!formData.date || !formData.time ? (
                    <p className="text-sm text-gray-400">Select date and time first to see available tables.</p>
                  ) : isLoadingTables ? (
                    <p className="text-sm text-gray-400">Loading available tables...</p>
                  ) : availabilityError ? (
                    <p className="text-sm text-red-300">{availabilityError}</p>
                  ) : availableTables.length === 0 ? (
                    <p className="text-sm text-red-300">No available tables for this slot.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {availableTables.map((table) => {
                          const selected = formData.tableNumbers.includes(table);
                          return (
                            <button
                              type="button"
                              key={table}
                              onClick={() => toggleTableSelection(table)}
                              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                                selected
                                  ? "bg-[#D4AF37] border-[#D4AF37] text-black"
                                  : "bg-[#1a1a1a] border-[#333] text-gray-200 hover:border-[#D4AF37]/60"
                              }`}
                            >
                              {table}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400">
                        Available tables: {availableTables.length} / 25 | Selected: {formData.tableNumbers.join(", ") || "None"}
                      </p>
                    </>
                  )}
                </div>

                <div className="pt-8">
                  <button 
                    onClick={() => setStep(2)}
                    disabled={!formData.date || !formData.time || formData.tableNumbers.length === 0}
                    className="w-full bg-[#D4AF37] disabled:bg-[#333] disabled:text-gray-500 text-white py-5 rounded-lg font-bold uppercase tracking-wider hover:bg-[#b5952f] transition-colors"
                  >
                    Continue to Contact Details
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-serif text-[#D4AF37] font-bold">Contact Details</h2>
                  <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-white uppercase tracking-wider font-bold">&larr; Back</button>
                </div>

                {errorMessage && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                      <input 
                        required
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        placeholder="+1 (234) 567-8900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Special Requests (Optional)</label>
                    <textarea 
                      value={formData.requests}
                      onChange={(e) => setFormData({...formData, requests: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-4 rounded-lg focus:outline-none focus:border-[#D4AF37] h-32 resize-none"
                      placeholder="Anniversary, allergy info, seating preference..."
                    />
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full bg-[#D4AF37] text-black py-5 rounded-lg font-bold uppercase tracking-wider hover:bg-[#b5952f] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-colors"
                    >
                      Confirm Reservation
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                <div className="h-24 w-24 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} className="text-[#D4AF37]" />
                </div>
                <h2 className="text-4xl font-serif text-white font-bold mb-4">Reservation Confirmed!</h2>
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                  Thank you, {formData.name || "Guest"}. Your table for {formData.guests} is reserved for {formData.date} at {formData.time}. A confirmation email has been sent to {formData.email || "your email"}.
                </p>
                <div className="p-6 bg-[#1a1a1a] border border-[#333] rounded-xl inline-block text-left mx-auto max-w-sm w-full">
                  <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-2">Booking Reference</p>
                  <p className="text-2xl text-[#D4AF37] font-mono tracking-widest mb-4">{bookingReference}</p>
                  <p className="text-sm text-gray-300 mb-4">Table(s): {formData.tableNumbers.join(", ")}</p>
                  <button onClick={() => setStep(1)} className="w-full bg-[#333] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#444] transition-colors">
                    Make Another Booking
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

