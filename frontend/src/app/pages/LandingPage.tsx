import React from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Wine, CalendarDays, Truck, UtensilsCrossed, Star, ArrowRight, ShoppingCart } from "lucide-react";
import { useApp } from "../context/AppContext";

export const LandingPage = () => {
  const { products, addToCart } = useApp();
  const topWines = products.filter((p) => p.type === "wine").slice(0, 4);

  const heroBgUrl = "https://images.unsplash.com/photo-1730149431617-64f97318c1af?auto=format&fit=crop&q=80&w=2000";
  const reservationImgUrl = "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1600";
  const aboutImgUrl = "https://images.unsplash.com/photo-1529060532150-a0c935a6d6e5?auto=format&fit=crop&q=80&w=1200";

  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  return (
    <div className="bg-[#0a0a0a] text-slate-100 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-0">
          <img src={heroBgUrl} alt="Luxury Wine Pub" className="w-full h-full object-cover object-[62%_45%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/55 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/20"></div>
        </div>

        <motion.div 
          className="relative z-10 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <div className="max-w-3xl">
            <motion.h1 
              variants={slideInLeft}
              className="text-5xl md:text-7xl font-serif text-white font-bold leading-tight mb-6 tracking-wide text-left"
            >
              Reserve Your <br />
              <span className="text-[#D4AF37]">Perfect Night</span><br />
              with Premium<br />
              Wines
            </motion.h1>
            <motion.p 
              variants={slideInLeft}
              className="text-sm md:text-base text-gray-300 mb-10 max-w-xl font-light leading-relaxed text-left"
            >
              Discover curated wines, reserve your table, and enjoy unforgettable moments in a truly luxurious ambience.
            </motion.p>
            <motion.div variants={slideInLeft} className="flex flex-col sm:flex-row items-start justify-start space-y-4 sm:space-y-0 sm:space-x-6">
              <Link 
                to="/wines" 
                className="w-full sm:w-auto px-7 py-3 bg-[#0a0a0a]/50 backdrop-blur-sm border border-[#D4AF37] text-[#D4AF37] rounded font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-black transition-all duration-300 text-xs md:text-sm flex items-center justify-center gap-2"
              >
                EXPLORE WINES -&gt;
              </Link>
              <Link 
                to="/reservations" 
                className="w-full sm:w-auto px-7 py-3 bg-[#D4AF37] text-black rounded font-bold uppercase tracking-wider hover:bg-[#c39b22] transition-all duration-300 text-xs md:text-sm flex items-center justify-center gap-2"
              >
                RESERVE A TABLE -&gt;
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 2. FEATURE HIGHLIGHTS */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              { icon: <Wine size={32} />, title: "Premium Wines", desc: "Handpicked wines from top brands worldwide." },
              { icon: <CalendarDays size={32} />, title: "Easy Reservations", desc: "Book your VIP table in seconds." },
              { icon: <Truck size={32} />, title: "Fast Delivery", desc: "Get your favorite bottles delivered to your door." },
              { icon: <UtensilsCrossed size={32} />, title: "Tasty Bites", desc: "Perfect curated pairings for your wine." },
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                variants={fadeIn}
                className="bg-[#111] border border-[#222] p-8 rounded-xl hover:border-[#D4AF37]/50 transition-colors group text-center"
              >
                <div className="text-[#D4AF37] mb-6 inline-flex justify-center group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3. TOP WINES SHOWCASE */}
      <section className="py-24 bg-[#111] border-y border-[#222]">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase mb-2">Trending Now</h2>
              <h3 className="text-4xl md:text-5xl font-serif text-white font-bold">Popular Wines</h3>
            </div>
            <Link to="/wines" className="hidden md:flex items-center text-[#D4AF37] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
              View All <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {topWines.map((wine) => (
              <motion.div key={wine.id} variants={fadeIn} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden group">
                <div className="relative h-64 overflow-hidden">
                  <img src={wine.image} alt={wine.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent"></div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-[#D4AF37] font-bold flex items-center border border-[#D4AF37]/30">
                    <Star size={12} className="mr-1 fill-[#D4AF37]" /> {wine.rating}
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">{wine.category}</span>
                  <h4 className="text-lg font-bold text-white mb-2 truncate">{wine.name}</h4>
                  <p className="text-[#D4AF37] font-serif text-xl mb-6">${wine.price}</p>
                  <button 
                    onClick={() => addToCart(wine, wine.sizes?.[0])}
                    className="w-full bg-transparent hover:bg-white/5 border border-[#2c313f] text-white py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. RESERVATION PROMO */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={reservationImgUrl} alt="Dining Setup" className="w-full h-full object-cover object-center opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/55 to-[#0a0a0a]/15"></div>
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            className="max-w-xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase mb-4">VIP Experience</h2>
            <h3 className="text-4xl md:text-6xl font-serif text-white font-bold mb-6 leading-tight">Plan Your Evening <br />with Us</h3>
            <ul className="space-y-4 mb-10 text-gray-300">
              <li className="flex items-center"><div className="h-2 w-2 rounded-full bg-[#D4AF37] mr-3"></div> Choose your perfect date & time</li>
              <li className="flex items-center"><div className="h-2 w-2 rounded-full bg-[#D4AF37] mr-3"></div> Select your preferred table location</li>
              <li className="flex items-center"><div className="h-2 w-2 rounded-full bg-[#D4AF37] mr-3"></div> Receive instant digital confirmation</li>
            </ul>
            <Link 
              to="/reservations" 
              className="inline-block px-10 py-4 bg-[#D4AF37] text-black rounded font-bold uppercase tracking-wider hover:bg-[#c39b22] transition-colors"
            >
              BOOK NOW -&gt;
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="py-24 bg-[#111] border-t border-[#222]">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase mb-2">Simple Process</h2>
          <h3 className="text-4xl md:text-5xl font-serif text-white font-bold mb-16">How It Works</h3>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { step: "1", title: "Browse Wines 🍷", desc: "Explore our extensive collection of premium wines and tasty bites." },
              { step: "2", title: "Reserve Table 🪑", desc: "Select your preferred date, time, and table for an unforgettable evening." },
              { step: "3", title: "Order & Enjoy 🍽️", desc: "Pre-order your drinks or simply arrive and experience true luxury." },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeIn} className="relative">
                <div className="h-16 w-16 mx-auto bg-[#1a1a1a] border border-[#333] rounded-full flex items-center justify-center text-2xl font-bold text-[#D4AF37] mb-6 relative z-10">
                  {item.step}
                </div>
                {i !== 2 && <div className="hidden md:block absolute top-8 left-[60%] right-[-40%] h-px bg-gradient-to-r from-[#D4AF37]/50 to-transparent border-t border-dashed border-[#D4AF37]/50"></div>}
                <h4 className="text-xl font-bold text-white mb-4">{item.title}</h4>
                <p className="text-gray-400 leading-relaxed text-sm px-4">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. CUSTOMER REVIEWS */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase mb-2 text-center">Testimonials</h2>
          <h3 className="text-4xl md:text-5xl font-serif text-white font-bold mb-16 text-center">What Our Guests Say</h3>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { name: "Eleanor Vance", text: "Amazing experience and great wine selection! The ambience is absolutely breathtaking." },
              { name: "Marcus Thorne", text: "Best reservation system I've used. Walked in and our wine was already decanting." },
              { name: "Sophia Lin", text: "The truffle fries paired with the Château Margaux is an out-of-this-world experience." },
            ].map((review, i) => (
              <motion.div key={i} variants={fadeIn} className="bg-[#111] p-8 rounded-xl border border-[#222]">
                <div className="flex text-[#D4AF37] mb-6">
                  {[...Array(5)].map((_, idx) => <Star key={idx} size={16} className="fill-[#D4AF37]" />)}
                </div>
                <p className="text-gray-300 italic mb-8 leading-relaxed text-sm">"{review.text}"</p>
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-[#333] rounded-full flex items-center justify-center font-bold text-gray-400">
                    {review.name.charAt(0)}
                  </div>
                  <span className="font-bold text-white">{review.name}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 7. ABOUT SECTION */}
      <section className="py-24 bg-[#111] border-t border-[#222]">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img src={aboutImgUrl} alt="Wine Cellar" className="rounded-xl w-full h-[500px] object-cover border border-[#333]" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase mb-4">Our Story</h2>
              <h3 className="text-4xl md:text-5xl font-serif text-white font-bold mb-8">Crafting Unforgettable Nights</h3>
              <p className="text-gray-400 leading-relaxed mb-6">
                Founded with a passion for exceptional viticulture and refined hospitality, VinoVerse is more than just a pub—it's an experience. We source our collection directly from the world's most prestigious vineyards to bring you unparalleled quality.
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Our mission is to create a sanctuary where connoisseurs and novices alike can explore the rich tapestry of wine in a luxurious, welcoming atmosphere.
              </p>
              <div className="flex space-x-6">
                <div>
                  <h4 className="text-3xl font-serif text-[#D4AF37] mb-2">500+</h4>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Wines</p>
                </div>
                <div>
                  <h4 className="text-3xl font-serif text-[#D4AF37] mb-2">50+</h4>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Partners</p>
                </div>
                <div>
                  <h4 className="text-3xl font-serif text-[#D4AF37] mb-2">5k+</h4>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Members</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="py-32 bg-gradient-to-b from-[#0a0a0a] to-[#D4AF37]/20 border-t border-[#333]">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-6xl font-serif text-white font-bold mb-8 leading-tight">Ready for a <br /><span className="text-[#D4AF37]">Perfect Night?</span></h2>
            <p className="text-xl text-gray-400 mb-12">Join our exclusive community and elevate your evenings with the finest wines and unparalleled service.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link 
                to="/wines" 
                className="w-full sm:w-auto px-10 py-5 bg-transparent border border-[#D4AF37] text-[#D4AF37] rounded font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-black transition-all duration-300"
              >
                EXPLORE WINES -&gt;
              </Link>
              <Link 
                to="/reservations" 
                className="w-full sm:w-auto px-10 py-5 bg-[#D4AF37] text-black rounded font-bold uppercase tracking-wider hover:bg-[#c39b22] transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.35)]"
              >
                RESERVE TABLE -&gt;
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
