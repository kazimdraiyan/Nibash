import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve previous target page if redirected here (e.g. /listings/new)
  const destination = (location.state as any)?.from?.pathname || "/";

  // Form State hooks
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      const loggedUser = await login(data.token);
      if (loggedUser?.is_verifier) {
        navigate("/verify/dashboard", { replace: true });
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px-240px)] flex items-center justify-center py-12 md:py-20 px-container-padding">
      <div className="max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Branding Panel */}
          <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-8 sm:p-10 rounded-2xl border border-slate-800 bg-[#12151c]">
            <div>
              <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tight leading-snug mb-4">
                Welcome back to{" "}
                <span className="font-serif italic font-normal text-silver-gradient-text block sm:inline">
                  Nibash
                </span>
              </h2>

              <p className="text-m text-[#94a3b8] leading-relaxed max-w-sm">
                Access and manage all your apartments from one place. Oversee legally structured digital contracts, track rental agreements and lease terms, monitor payments and due dates, and keep your rental operations organized throughout the entire leasing process.
              </p>
            </div>

            {/* Stats & Trust Indicators */}
            <div className="pt-8 mt-8 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  {/* // TODO: Query needed */}
                  <span className="block font-serif text-3xl text-white font-light">1,200+</span>
                  <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-label-sm mt-1 block">
                    Verified Apartments
                  </span>
                </div>
                <div>
                  <span className="block font-serif text-3xl text-white font-light">12+</span>
                  <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-label-sm mt-1 block">
                    Areas Covered
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Form — Solid Card */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-[#12151c] border border-slate-800 rounded-2xl p-8 sm:p-10 max-w-xl mx-auto w-full">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  Log in to Your{" "}
                  <span className="font-serif italic font-normal text-silver-gradient-text">
                    Account
                  </span>
                </h1>
                <p className="text-xs text-[#94a3b8] mt-1.5 font-normal">
                  Enter your credentials to continue to your dashboard
                </p>
              </div>

              {/* Error Alerts */}
              {error && (
                <div className="mb-6 p-4 bg-red-950/70 border border-red-800 rounded-xl flex items-center gap-3 text-red-200">
                  <span className="material-symbols-outlined text-red-400 text-xl shrink-0">
                    error
                  </span>
                  <div className="text-xs font-medium">{error}</div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Email Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="block text-xs uppercase tracking-widest text-slate-400 font-label-sm font-semibold"
                    htmlFor="login-email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                      mail
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-[#090a0c] text-white border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white/30 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="block text-xs uppercase tracking-widest text-slate-400 font-label-sm font-semibold"
                    htmlFor="login-password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                      lock
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#090a0c] text-white border border-slate-700 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white/30 transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-[#090a0c] py-3.5 px-6 rounded-xl font-label-sm text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span>Logging in...</span>
                      <span className="w-4 h-4 border-2 border-[#090a0c] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Log In</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Link to Register */}
              <div className="mt-8 text-center pt-6 border-t border-slate-800">
                <p className="text-xs sm:text-sm text-[#94a3b8]">
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-white font-semibold underline underline-offset-4 hover:text-[#d4b068] transition-colors ml-1 cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
