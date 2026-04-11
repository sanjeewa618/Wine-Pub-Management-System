import React, { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Clock3, Mail, MapPin, Phone, Send } from "lucide-react";
import contactImage from "../../images/contact1.png";

const contactCards = [
  {
    title: "Email",
    value: "hello@heaven8.com",
    sub: "We usually reply within 24 hours.",
    icon: Mail,
  },
  {
    title: "Phone",
    value: "+94 77 123 4567",
    sub: "Daily support from 10:00 AM to 11:00 PM.",
    icon: Phone,
  },
  {
    title: "Location",
    value: "Colombo 07, Sri Lanka",
    sub: "Visit us for a premium evening experience.",
    icon: MapPin,
  },
];

export const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-[#090909] text-slate-100 pt-28 pb-24">
      <section className="container mx-auto px-4 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#252525] bg-[#0f0f0f] min-h-[500px]">
          <img
            src={contactImage}
            alt="Customer support contact background"
            className="absolute inset-0 h-full w-full object-cover object-center brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060606]/50 via-[#080808]/40 to-[#0a0a0a]/50" />
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(227,192,106,0.15),transparent_48%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.05),transparent_40%)]" />
          <div className="relative text-center p-8 md:p-12">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.75 }}
              className="text-xs md:text-sm uppercase tracking-[0.22em] text-[#E3C06A] font-bold"
            >
              Contact HeaveN8
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.85, delay: 0.08 }}
              className="mt-4 text-5xl md:text-7xl font-serif text-white font-bold leading-tight"
            >
              Let&apos;s Plan Your Perfect Night
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.85, delay: 0.18 }}
              className="mt-6 mx-auto max-w-3xl text-gray-200 text-sm md:text-base leading-relaxed opacity-85"
            >
              Reach out for table reservations, private events, menu support, or general inquiries. Our team is ready to help
              you enjoy a smooth and memorable HeaveN8 experience.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.75, delay: 0.3 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                to="/reservations"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E3C06A] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-[#CDA74C] transition-colors"
              >
                Book A Table
              </Link>
              <Link
                to="/wines"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E3C06A]/60 bg-black/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#E3C06A] hover:bg-[#E3C06A] hover:text-black transition-colors"
              >
                Explore Drinks
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-6 items-stretch">
          <div className="space-y-4 h-full">
            {contactCards.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.45 }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="rounded-2xl border border-[#252525] bg-[#111] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg border border-[#E3C06A]/35 bg-[#E3C06A]/10 flex items-center justify-center text-[#E3C06A]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#E3C06A] font-bold">{item.title}</p>
                      <p className="mt-2 text-lg text-white font-semibold">{item.value}</p>
                      <p className="mt-1 text-sm text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                </motion.article>
              );
            })}

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="rounded-2xl border border-[#252525] bg-[#101010] p-5"
            >
              <div className="flex items-center gap-3 text-[#E3C06A]">
                <Clock3 size={18} />
                <h3 className="text-sm uppercase tracking-[0.2em] font-bold">Opening Hours</h3>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex justify-between text-gray-300"><span>Monday - Thursday</span><span>4:00 PM - 11:00 PM</span></p>
                <p className="flex justify-between text-gray-300"><span>Friday - Saturday</span><span>4:00 PM - 1:00 AM</span></p>
                <p className="flex justify-between text-gray-300"><span>Sunday</span><span>4:00 PM - 10:00 PM</span></p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.65 }}
            className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 md:p-8 h-full"
          >
            <h2 className="text-2xl md:text-3xl font-serif text-white font-bold">Send Us a Message</h2>
            <p className="mt-2 text-sm md:text-base text-gray-400">
              Share your inquiry and our team will get back to you quickly.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  type="text"
                  placeholder="Your Name"
                  className="w-full bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E3C06A]"
                />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  className="w-full bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E3C06A]"
                />
              </div>

              <input
                required
                type="text"
                placeholder="Subject"
                className="w-full bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E3C06A]"
              />

              <textarea
                required
                placeholder="Write your message..."
                className="w-full min-h-[140px] bg-[#0d0d0d] border border-[#2e2e2e] rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E3C06A] resize-y"
              />

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E3C06A] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-[#CDA74C] transition-colors"
              >
                Send Message
                <Send size={15} />
              </button>

              {submitted && (
                <p className="text-sm text-emerald-300">
                  Message sent successfully. We will contact you soon.
                </p>
              )}
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;

