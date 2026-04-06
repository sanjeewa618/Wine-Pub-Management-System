import React from "react";
import { Link } from "react-router";
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-black text-white pt-16 pb-8 border-t border-[#333]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <span className="text-2xl font-serif text-[#D4AF37] font-bold tracking-wider mb-4 block">
              ðŸ· VinoVerse
            </span>
            <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
              Sip. Reserve. Experience. The premium destination for wine lovers, offering curated selections, exclusive reservations, and unforgettable nights.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-[#1a1a1a] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider mb-6">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/wines" className="text-gray-400 hover:text-white transition-colors">Our Wines</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-white transition-colors">Journal</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider mb-6">Support</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <span>123 Vineyard Lane, Wine District, NY 10012</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-[#D4AF37] shrink-0" />
                <span>+1 (234) 567-8900</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-[#D4AF37] shrink-0" />
                <span>hello@vinoverse.com</span>
              </li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[#D4AF37] font-bold uppercase tracking-wider mb-6">Newsletter</h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <form className="flex flex-col space-y-3" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-[#1a1a1a] border border-[#333] text-white px-4 py-3 rounded focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#D4AF37] hover:bg-[#b5952f] text-white px-4 py-3 rounded font-bold uppercase tracking-wider transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-[#333] flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} VinoVerse. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

