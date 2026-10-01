import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.patch<{ message: string }>("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setSuccess(response.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect after brief delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to change password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px-240px)] flex items-center justify-center py-12 md:py-20 px-container-padding">
      <div className="max-w-[1280px] mx-auto w-full">
          {/* Left Column: Branding Panel */}
          {/* <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-8 sm:p-10 rounded-2xl border border-slate-800 bg-[#12151c]">
            <div>
              <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tight leading-snug mb-4">
                Update Your{" "}
                <span className="font-serif italic font-normal text-silver-gradient-text block sm:inline">
                  Credentials
                </span>
              </h2>

              <p className="text-sm text-[#94a3b8] leading-relaxed max-w-sm font-normal">
                Maintain seamless control over your account. Changing your password updates your
                cryptographic protection across all your digital leases, agreements, and listings.
              </p>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block font-serif text-3xl text-white font-light">bcrypt</span>
                  <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-label-sm mt-1 block">
                    Salted Encryption
                  </span>
                </div>
                <div>
                  <span className="block font-serif text-3xl text-white font-light">256-bit</span>
                  <span className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-label-sm mt-1 block">
                    Encrypted Auth
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-[#d4b068] shrink-0">
                  <span className="material-symbols-outlined text-xl">shield_lock</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Instant Credential Safeguard</p>
                  <p className="text-[11px] text-[#94a3b8]">Verified identity verification before updates</p>
                </div>
              </div>
            </div>
          </div> */}

          {/* Right Column: Change Password Form */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-[#12151c] border border-slate-800 rounded-2xl p-8 sm:p-10 max-w-xl mx-auto w-full">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                  Change Your{" "}
                  <span className="font-serif italic font-normal text-silver-gradient-text">
                    Password
                  </span>
                </h1>
                <p className="text-xs text-[#94a3b8] mt-1.5 font-normal">
                  Enter your existing password and choose a secure new password
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

              {/* Success Alerts */}
              {success && (
                <div className="mb-6 p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-200">
                  <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0">
                    check_circle
                  </span>
                  <div className="text-xs font-medium">
                    {success} Redirecting to homepage...
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Current Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="block text-xs uppercase tracking-widest text-slate-400 font-label-sm font-semibold"
                    htmlFor="current-password"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                      lock
                    </span>
                    <input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      disabled={loading || Boolean(success)}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full bg-[#090a0c] text-white border border-slate-700 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white/30 transition-all placeholder:text-slate-600 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={loading || Boolean(success)}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showCurrentPassword ? "Hide password" : "Show password"}
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showCurrentPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* New Password Field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label
                      className="block text-xs uppercase tracking-widest text-slate-400 font-label-sm font-semibold"
                      htmlFor="new-password"
                    >
                      New Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Min 8 characters</span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                      key
                    </span>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      disabled={loading || Boolean(success)}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password (minimum 8 characters)"
                      className="w-full bg-[#090a0c] text-white border border-slate-700 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white/30 transition-all placeholder:text-slate-600 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={loading || Boolean(success)}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showNewPassword ? "Hide password" : "Show password"}
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showNewPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="block text-xs uppercase tracking-widest text-slate-400 font-label-sm font-semibold"
                    htmlFor="confirm-password"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                      check_circle
                    </span>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      disabled={loading || Boolean(success)}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full bg-[#090a0c] text-white border border-slate-700 rounded-xl py-3.5 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-white focus:ring-1 focus:ring-white/30 transition-all placeholder:text-slate-600 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={loading || Boolean(success)}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showConfirmPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || Boolean(success)}
                  className="w-full bg-white text-[#090a0c] py-3.5 px-6 rounded-xl font-label-sm text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 transition-all disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span>Updating password...</span>
                      <span className="w-4 h-4 border-2 border-[#090a0c] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Change Password</span>
                      <span className="material-symbols-outlined text-sm">lock_reset</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
}
