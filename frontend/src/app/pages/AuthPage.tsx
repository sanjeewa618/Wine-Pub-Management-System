import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useApp, Role } from "../context/AppContext";
import { Wine, Facebook, Chrome, Eye, EyeOff } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s]{1,59}$/;
const SELLER_NAME_REGEX = /^(?=.{2,80}$)[A-Za-z0-9][A-Za-z0-9\s&.,'/-]{1,79}$/;

const ROLE_NAME_FIELD: Record<Exclude<Role, "guest">, { label: string; placeholder: string }> = {
  customer: { label: "Full Name", placeholder: "John Doe" },
  seller: { label: "Company/Restaurant/Supplier Name", placeholder: "Golden Barrel Suppliers" },
  admin: { label: "Full Name", placeholder: "Admin User" },
};

export const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const [isLogin, setIsLogin] = useState(mode === "login");
  const { login, register } = useApp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer" as Exclude<Role, "guest">,
  });

  useEffect(() => {
    setIsLogin(mode === "login");
    setErrorMessage("");
    setSuccessMessage("");
  }, [mode]);

  const navigateByRole = (role: Role) => {
    if (role === "admin") navigate("/admin");
    else if (role === "seller") navigate("/seller");
    else navigate("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;
      const normalizedName = formData.name.trim();

      if (!EMAIL_REGEX.test(email)) {
        throw new Error("Invalid email format");
      }

      if (!isLogin) {
        if (formData.role === "seller") {
          if (!SELLER_NAME_REGEX.test(normalizedName)) {
            throw new Error("Company/Restaurant/Supplier name should be 2-80 characters");
          }
        } else if (!NAME_REGEX.test(normalizedName)) {
          throw new Error("Full name should contain only letters and spaces (2-60 characters)");
        }

        if (!PASSWORD_REGEX.test(password)) {
          throw new Error("Password must be 8-16 characters and include uppercase, number, and special character");
        }
      }

      if (isLogin) {
        const user = await login(email, password);
        navigateByRole(user.role);
        return;
      }

      const registerResult = await register({
        name: normalizedName,
        email,
        password,
        role: formData.role,
      });

      if (registerResult.requiresApproval) {
        setSuccessMessage(registerResult.message || "Seller registration requested successfully. Wait for admin approval.");
        setFormData({ name: "", email, password: "", role: "customer" });
        return;
      }

      setSuccessMessage(registerResult.message || "Registration successful. Click Login here to sign in.");
      setFormData({ name: "", email, password: "", role: "customer" });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909]">
      <div className="w-full min-h-screen bg-[#111] border-y border-[#2a2a2a] shadow-2xl overflow-hidden">
        <div className="px-6 pt-5">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-semibold text-[#D4AF37] hover:text-white transition-colors"
          >
            &larr; Home
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] min-h-[calc(100vh-56px)]">
          <div className="hidden lg:flex relative border-r border-[#2a2a2a] bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.20),transparent_40%),radial-gradient(circle_at_75%_30%,rgba(212,175,55,0.35),transparent_45%),linear-gradient(145deg,#121212_0%,#0b0b0b_50%,#151515_100%)] overflow-hidden">
            <div className="absolute top-20 left-16 h-40 w-40 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/8 blur-sm"></div>
            <div className="absolute bottom-20 right-14 h-56 w-56 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/20 blur-sm"></div>
            <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"></div>

            <div className="relative z-10 p-12 self-center w-full">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-10">
                <div className="h-24 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"></div>
                <div className="h-24 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 backdrop-blur-md"></div>
                <div className="h-24 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/15 backdrop-blur-md"></div>
                <div className="h-24 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"></div>
              </div>

              <h2 className="text-4xl font-serif font-bold text-white mb-3 text-center">VinoVerse Lounge</h2>
              <p className="text-gray-300 text-sm leading-relaxed max-w-sm mx-auto text-center">
                Discover premium wines, reserve your table, and enjoy curated bites in a luxury ambience.
              </p>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-[#D4AF37] rounded-full mx-auto flex items-center justify-center mb-4 border border-[#D4AF37]">
                <Wine className="text-black" size={32} />
              </div>
              <h1 className="text-3xl font-serif text-white font-bold mb-2">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-gray-400 text-sm">
                {isLogin ? "Enter your credentials to access your account." : "Join VinoVerse for an exclusive experience."}
              </p>
              {successMessage && <p className="mt-4 text-sm text-green-400 font-semibold">{successMessage}</p>}
              {errorMessage && <p className="mt-4 text-sm text-red-300">{errorMessage}</p>}
            </div>

            <form className="space-y-6 max-w-md mx-auto" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Register Role</label>
                    <select
                      value={formData.role}
                      onChange={(event) => {
                        const nextRole = event.target.value as Exclude<Role, "guest">;
                        setFormData({
                          name: "",
                          email: "",
                          password: "",
                          role: nextRole,
                        });
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#D4AF37] transition-colors"
                    >
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {ROLE_NAME_FIELD[formData.role].label}
                    </label>
                    <input
                      type="text"
                      placeholder={ROLE_NAME_FIELD[formData.role].placeholder}
                      required
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      className="auth-input w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#D4AF37] transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="auth-input w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    value={formData.password}
                    onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                    className="auth-input w-full bg-[#1a1a1a] border border-[#333] text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-white hover:text-[#D4AF37] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-gray-500">
                    Use 8-16 characters with at least one uppercase letter, one number, and one special character.
                  </p>
                )}
              </div>

              {isLogin && (
                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center text-gray-400 cursor-pointer">
                    <input type="checkbox" className="mr-2 accent-[#D4AF37]" /> Remember me
                  </label>
                  <a href="#" className="text-[#D4AF37] hover:text-white transition-colors">Forgot password?</a>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#D4AF37] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#b5952f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </button>
              </div>
            </form>

            <div className="my-6 flex items-center gap-3 text-gray-500 text-xs uppercase tracking-wider">
              <div className="h-px bg-[#2f2f2f] flex-1"></div>
              <span>Or continue with</span>
              <div className="h-px bg-[#2f2f2f] flex-1"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                className="h-11 rounded-lg border border-[#333] bg-[#151515] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
              >
                <Chrome size={16} />
                Sign in with Google
              </button>
              <button
                type="button"
                className="h-11 rounded-lg border border-[#333] bg-[#151515] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
              >
                <Facebook size={16} />
                Sign in with Facebook
              </button>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => navigate(`/auth?mode=${isLogin ? "register" : "login"}`)}
                className="text-[#D4AF37] font-bold hover:text-white transition-colors"
              >
                {isLogin ? "Register now" : "Login here"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

