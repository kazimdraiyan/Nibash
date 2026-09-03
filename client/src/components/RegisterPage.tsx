import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form State hooks
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nid, setNID] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!phone.trim() || !/^01\d{9}$/.test(phone.trim())) {
      setError("Phone number must be a valid 11-digit Bangladeshi number starting with 01.");
      return;
    }
    if (!nid.trim() || !/^\d{10}$|^\d{13}$|^\d{17}$/.test(nid.trim())) {
      setError("NID must be 10, 13, or 17 numeric digits.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the Nibash terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          nid: nid.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed. Please check the provided information.");
      }

      await login(data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px-240px)] flex items-center justify-center py-12 md:py-20 px-container-padding">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-radial from-slate-400/8 via-slate-600/3 to-transparent blur-3xl opacity-60" />
      <div className="pointer-events-none absolute bottom-0 right-10 w-[450px] h-[450px] rounded-full bg-radial from-white/5 to-transparent blur-3xl opacity-50" />

      <div className="relative z-10 max-w-[1280px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Branding Glass Panel */}
          <div className="lg:col-span-4 hidden lg:flex flex-col justify-between p-8 sm:p-10 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12151c]/95 via-[#0d1017]/95 to-[#090a0c] relative overflow-hidden shadow-2xl">
            {/* Top metallic highlight bar */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 mb-6 w-fit shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4b068] animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#cbd5e1] font-label-sm font-medium">
                  Verified Membership
                </span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tight leading-snug mb-4">
                Join <span className="font-serif italic font-normal text-silver-gradient-text">Nibash</span>
              </h2>

              <p className="text-sm text-[#94a3b8] leading-relaxed mb-6 font-normal">
                Register as a resident or property owner to discover, lease, and manage premium properties across Bangladesh.
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-5 pt-6 border-t border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#d4b068] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-white">
                    NID Authentication
                  </span>
                  <span className="text-xs text-[#94a3b8] leading-relaxed">
                    Verified national identification prevents impersonation and double-listings.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#cbd5e1] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-lg">description</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-white">
                    Digital Contracts
                  </span>
                  <span className="text-xs text-[#94a3b8] leading-relaxed">
                    Legally structured online lease agreements with verifiable digital records.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#cbd5e1] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-white">
                    Automated Records
                  </span>
                  <span className="text-xs text-[#94a3b8] leading-relaxed">
                    Track security deposits, monthly rent, and automated receipts effortlessly.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Register Form Glass Card */}
          <div className="lg:col-span-8 flex flex-col justify-center">
            <div className="bg-[#12151c]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-8 sm:p-10 w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] relative overflow-hidden">
              {/* Subtle top metallic highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  Create Your <span className="font-serif italic font-normal text-silver-gradient-text">Account</span>
                </h1>
                <p className="text-xs text-[#94a3b8] mt-1.5 font-normal">
                  Fill in your official credentials to establish your verified Nibash profile
                </p>
              </div>

              {/* Error Alerts */}
              {error && (
                <div className="mb-6 p-4 bg-red-950/70 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-200 shadow-sm">
                  <span className="material-symbols-outlined text-red-400 text-xl shrink-0">
                    error
                  </span>
                  <div className="text-xs font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="block text-xs uppercase tracking-widest text-[#cbd5e1] font-label-sm font-semibold"
                      htmlFor="reg-name"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xl">
                        badge
                      </span>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Official name as per NID"
                        className="w-full bg-[#090a0c]/90 text-white border border-white/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white/70 focus:ring-1 focus:ring-white/40 transition-all placeholder:text-[#64748b] shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="block text-xs uppercase tracking-widest text-[#cbd5e1] font-label-sm font-semibold"
                      htmlFor="reg-email"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xl">
                        mail
                      </span>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@domain.com"
                        className="w-full bg-[#090a0c]/90 text-white border border-white/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white/70 focus:ring-1 focus:ring-white/40 transition-all placeholder:text-[#64748b] shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="block text-xs uppercase tracking-widest text-[#cbd5e1] font-label-sm font-semibold"
                      htmlFor="reg-phone"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xl">
                        call
                      </span>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        maxLength={11}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full bg-[#090a0c]/90 text-white border border-white/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white/70 focus:ring-1 focus:ring-white/40 transition-all placeholder:text-[#64748b] shadow-inner"
                      />
                    </div>
                  </div>

                  {/* National ID */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="block text-xs uppercase tracking-widest text-[#cbd5e1] font-label-sm font-semibold"
                      htmlFor="reg-nid"
                    >
                      National ID (NID)
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xl">
                        credit_card
                      </span>
                      <input
                        id="reg-nid"
                        type="text"
                        required
                        maxLength={17}
                        value={nid}
                        onChange={(e) => setNID(e.target.value)}
                        placeholder="10, 13, or 17 digits"
                        className="w-full bg-[#090a0c]/90 text-white border border-white/20 rounded-xl py-3 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white/70 focus:ring-1 focus:ring-white/40 transition-all placeholder:text-[#64748b] shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label
                      className="block text-xs uppercase tracking-widest text-[#cbd5e1] font-label-sm font-semibold"
                      htmlFor="reg-password"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xl">
                        lock
                      </span>
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full bg-[#090a0c]/90 text-white border border-white/20 rounded-xl py-3 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-white/70 focus:ring-1 focus:ring-white/40 transition-all placeholder:text-[#64748b] shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white transition-colors p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-2.5 py-1">
                  <input
                    id="reg-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-[#090a0c] bg-[#090a0c] accent-white cursor-pointer mt-0.5"
                  />
                  <label
                    htmlFor="reg-terms"
                    className="text-xs text-[#94a3b8] cursor-pointer select-none leading-relaxed"
                  >
                    I certify that the information provided is accurate and agree to the{" "}
                    <span className="text-white underline">Nibash Terms of Service</span> and{" "}
                    <span className="text-white underline">Privacy Policy</span>.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button-silver w-full py-4 px-6 rounded-xl font-label-sm text-xs uppercase tracking-widest text-[#090a0c] font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span>Creating Account...</span>
                      <span className="w-4 h-4 border-2 border-[#090a0c] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Create Account</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  )}
                </button>
              </form>

              {/* Link to Login */}
              <div className="mt-8 text-center pt-6 border-t border-white/10">
                <p className="text-xs sm:text-sm text-[#94a3b8]">
                  Already registered with Nibash?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-white font-semibold underline underline-offset-4 hover:text-[#d4b068] transition-colors ml-1 cursor-pointer"
                  >
                    Log In
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
