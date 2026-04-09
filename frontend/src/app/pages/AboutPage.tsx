import React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { CalendarDays, Handshake, Headset, ShieldCheck, Smile, Store, Wine } from "lucide-react";

const highlights = [
  {
    title: "Wine & Liquor Variety",
    description: "From light reds to bold spirits, VinoVerse brings together rich liquor categories for every mood and moment.",
    icon: Wine,
  },
  {
    title: "Customer-Seller Trust",
    description: "Our platform helps customers and sellers connect with clear flows, faster updates, and smooth transactions.",
    icon: Handshake,
  },
  {
    title: "Best Customer Service",
    description: "From table booking to order completion, we focus on reliable support and a stress-free night experience.",
    icon: Headset,
  },
  {
    title: "Easy Advance Booking",
    description: "Reserve your table in advance and enjoy your night freely without waiting or last-minute rush.",
    icon: CalendarDays,
  },
];

const imageCards = [
  {
    title: "Premium Wine & Liquor Picks",
    subtitle: "Curated for every taste",
    imageUrl:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Happy Customers, Better Nights",
    subtitle: "Moments worth sharing",
    imageUrl:
      "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Service That Feels Premium",
    subtitle: "Fast, warm, dependable",
    imageUrl:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80",
  },
];

const steps = [
  {
    title: "Discover",
    text: "Browse wines, liquor categories, and bites based on your taste and budget.",
  },
  {
    title: "Reserve",
    text: "Book your table in advance so your evening starts on time without hassle.",
  },
  {
    title: "Enjoy",
    text: "Spend your night freely while we handle smooth ordering and reliable service.",
  },
];

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#090909] text-slate-100 pt-28 pb-24">
      <section className="container mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#232323]">
          <img
            src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=2000&q=80"
            alt="Dark liquor ambience"
            className="absolute inset-0 h-full w-full object-cover object-center brightness-95"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/52 via-[#050505]/62 to-[#050505]/76" />

          <div className="relative px-6 md:px-14 py-20 md:py-28 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-serif text-white font-bold leading-tight"
            >
              About VinoVerse
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: 0.85, delay: 0.12 }}
              className="mt-6 mx-auto max-w-4xl text-[#F5EAD0] text-base md:text-2xl leading-relaxed md:leading-[1.75] font-serif italic font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
            >
              "At VinoVerse, we bring together premium wines, crafted cocktails, and welcoming hospitality to create nights
              that feel effortless from start to finish. From easy table reservations to smooth ordering and attentive
              service, every detail is designed so you can relax, celebrate, and enjoy memorable moments with the people
              who matter most."
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.55 }}
              transition={{ duration: 0.75, delay: 0.24 }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                to="/reservations"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E3C06A] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-[#CDA74C] transition-colors"
              >
                Book A Table
                <CalendarDays size={16} />
              </Link>
              <Link
                to="/wines"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E3C06A]/60 bg-black/35 px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors"
              >
                Explore Drinks
                <Wine size={16} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-2xl border border-[#232323] bg-[#101010] p-5"
              >
                <Icon size={20} className="text-[#E3C06A]" />
                <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">{item.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 0.8 }}
          className="flex items-end justify-between gap-4 mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-serif text-white font-bold">The VinoVerse Mood</h2>
          <p className="text-sm text-[#E3C06A] uppercase tracking-[0.2em] font-bold">Wine • Customers • Service</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {imageCards.map((card, idx) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              className="group overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#101010]"
            >
              <div className="h-56 overflow-hidden">
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-wider text-[#E3C06A] font-bold">{card.subtitle}</p>
                <h3 className="mt-2 text-xl font-bold text-white">{card.title}</h3>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pt-12">
        <div className="rounded-3xl border border-[#242424] bg-[#0f0f0f] p-7 md:p-10">
          <div className="flex items-center gap-2 text-[#E3C06A] text-xs uppercase tracking-[0.2em] font-bold">
            <ShieldCheck size={14} />
            How It Works
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-xl border border-[#262626] bg-[#121212] p-5"
              >
                <p className="text-[#E3C06A] text-sm font-bold">0{idx + 1}</p>
                <h3 className="mt-2 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: 0.85 }}
          className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h3 className="text-2xl md:text-3xl font-serif text-white font-bold">Ready To Spend A Free, Happy Night?</h3>
            <p className="mt-2 text-gray-300 text-sm md:text-base">
              Reserve your table early, enjoy your favorite drinks, and let VinoVerse handle the rest.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[#E3C06A]">
            <Smile size={18} />
            <Store size={18} />
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default AboutPage;
