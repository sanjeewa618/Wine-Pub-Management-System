import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Hash, Users } from "lucide-react";
import { apiRequest } from "../services/api";

type Reservation = {
  _id: string;
  bookingReference: string;
  customerName: string;
  email: string;
  date: string;
  time: string;
  guestCount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  tableLabel?: string;
  tableLabels?: string[];
  createdAt: string;
};

function reservationDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function formatLocalDateTime(date: string, time: string) {
  const dt = reservationDateTime(date, time);
  return dt.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: Reservation["status"]) {
  if (status === "confirmed") return "border-emerald-600/50 bg-emerald-700/10 text-emerald-300";
  if (status === "completed") return "border-sky-600/50 bg-sky-700/10 text-sky-300";
  if (status === "cancelled") return "border-red-600/50 bg-red-700/10 text-red-300";
  return "border-amber-600/50 bg-amber-700/10 text-amber-300";
}

export const CustomerReservationsPage = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchReservations = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest<{ reservations: Reservation[] }>("/reservations");
        if (!isActive) {
          return;
        }

        const sorted = [...(response.reservations ?? [])].sort(
          (a, b) => reservationDateTime(b.date, b.time).getTime() - reservationDateTime(a.date, a.time).getTime()
        );
        setReservations(sorted);
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load reservations");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchReservations();
    const pollId = window.setInterval(() => {
      void fetchReservations();
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(pollId);
    };
  }, []);

  const upcomingCount = useMemo(
    () => reservations.filter((item) => reservationDateTime(item.date, item.time).getTime() >= now && item.status !== "cancelled").length,
    [reservations, now]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#333] bg-[#111] p-6">
        <h1 className="text-3xl font-serif text-white">My Reservations</h1>
        <p className="mt-2 text-sm text-gray-400">
          Reservations are shown in local date/time and auto-refresh every 15 seconds.
        </p>
        <div className="mt-4 inline-flex rounded-lg border border-[#3a3a3a] bg-[#171717] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
          Upcoming bookings: {upcomingCount}
        </div>
      </div>

      {loading && <div className="rounded-xl border border-[#333] bg-[#111] p-5 text-sm text-gray-300">Loading reservations...</div>}
      {errorMessage && <div className="rounded-xl border border-red-500/40 bg-red-600/10 p-5 text-sm text-red-200">{errorMessage}</div>}

      {!loading && !errorMessage && reservations.length === 0 && (
        <div className="rounded-xl border border-[#333] bg-[#111] p-8 text-center text-gray-400">No reservations found for your account yet.</div>
      )}

      <div className="space-y-4">
        {reservations.map((reservation) => {
          const tableList = Array.isArray(reservation.tableLabels) && reservation.tableLabels.length > 0
            ? reservation.tableLabels
            : reservation.tableLabel
              ? [reservation.tableLabel]
              : [];

          return (
            <div key={reservation._id} className="rounded-2xl border border-[#333] bg-[#111] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClass(reservation.status)}`}>
                      {reservation.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#3b3b3b] bg-[#171717] px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                      <Hash size={12} /> {reservation.bookingReference}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-white">{reservation.customerName}</h2>
                  <p className="text-sm text-gray-400">{reservation.email}</p>
                </div>
                <p className="text-xs text-gray-500">Booked at: {new Date(reservation.createdAt).toLocaleString()}</p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[#2f2f2f] bg-[#171717] p-3 text-sm text-gray-200">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400"><CalendarDays size={14} /> Reservation Date/Time</p>
                  <p>{formatLocalDateTime(reservation.date, reservation.time)}</p>
                </div>
                <div className="rounded-lg border border-[#2f2f2f] bg-[#171717] p-3 text-sm text-gray-200">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400"><Clock3 size={14} /> Time Slot</p>
                  <p>{reservation.time}</p>
                </div>
                <div className="rounded-lg border border-[#2f2f2f] bg-[#171717] p-3 text-sm text-gray-200">
                  <p className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-gray-400"><Users size={14} /> Guests</p>
                  <p>{reservation.guestCount}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#2f2f2f] bg-[#171717] p-3 text-sm text-gray-200">
                <p className="mb-1 text-xs uppercase tracking-wider text-gray-400">Reserved Tables</p>
                <p>{tableList.length ? tableList.join(", ") : "Not assigned"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
