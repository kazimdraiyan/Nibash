import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

export function RoleOnboardingPage() {
  const { user, token } = useAuth();

  // State for Become Tenant form
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantSuccess, setTenantSuccess] = useState<string | null>(null);

  // State for Become Owner action
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSuccess, setOwnerSuccess] = useState<string | null>(null);

  if (!token || !user) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-3">Authentication Required</h1>
        <p className="text-slate-400 mb-6">
          Please log in or register an account before activating your role.
        </p>
        <Link
          to="/login"
          className="inline-block bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const handleBecomeOwner = async () => {
    setOwnerLoading(true);
    setOwnerError(null);
    setOwnerSuccess(null);
    try {
      const res = await apiClient.post<{ message: string }>("/auth/become-owner");
      setOwnerSuccess(res.message || "Successfully registered as property owner!");
    } catch (err: any) {
      setOwnerError(err.message || "Failed to become owner.");
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleBecomeTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setTenantLoading(true);
    setTenantError(null);
    setTenantSuccess(null);

    const incomeNum = parseFloat(monthlyIncome);
    if (isNaN(incomeNum) || incomeNum <= 0) {
      setTenantError("Monthly income must be a positive number.");
      setTenantLoading(false);
      return;
    }

    if (!/^01\d{9}$/.test(emergencyContact.trim())) {
      setTenantError("Emergency contact must be an 11-digit Bangladeshi number starting with 01.");
      setTenantLoading(false);
      return;
    }

    try {
      const res = await apiClient.post<{ message: string }>("/auth/become-tenant", {
        monthly_income: incomeNum,
        emergency_contact: emergencyContact.trim(),
      });
      localStorage.setItem(`nibash_tenant_${user.id}`, "true");
      setTenantSuccess(res.message || "Successfully registered as tenant profile!");
    } catch (err: any) {
      setTenantError(err.message || "Failed to become tenant.");
    } finally {
      setTenantLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold text-white mb-2">Role Onboarding</h1>
        <p className="text-sm text-slate-400">
          Logged in as <span className="text-white font-medium">{user.name}</span> ({user.email}).
          Activate your profile as an Owner to list properties, or as a Tenant to apply and lease residences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Owner Card */}
        <div className="border border-slate-800 bg-[#12151c] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4">
              <span className="material-symbols-outlined">real_estate_agent</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">Become an Owner</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              List rental properties, receive tenant applications, propose digital leases, and collect rent payments.
            </p>

            {ownerError && (
              <div className="p-3 mb-4 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {ownerError}
              </div>
            )}
            {ownerSuccess && (
              <div className="p-3 mb-4 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                {ownerSuccess}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleBecomeOwner}
              disabled={ownerLoading}
              className="w-full bg-white text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
            >
              {ownerLoading ? "Activating Owner Role..." : "Activate Owner Account"}
            </button>
            <div className="mt-3 text-center">
              <Link
                to="/listings/new"
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Go to Add Property Form →
              </Link>
            </div>
          </div>
        </div>

        {/* Tenant Card */}
        <div className="border border-slate-800 bg-[#12151c] rounded-xl p-6">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white mb-4">
            <span className="material-symbols-outlined">person_pin</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-1">Become a Tenant</h2>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Provide verified income information and an emergency contact to apply for residences and sign digital contracts.
          </p>

          {tenantError && (
            <div className="p-3 mb-4 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
              {tenantError}
            </div>
          )}
          {tenantSuccess && (
            <div className="p-3 mb-4 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
              {tenantSuccess}
            </div>
          )}

          <form onSubmit={handleBecomeTenant} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="monthly-income"
                className="block text-xs uppercase font-medium text-slate-400 mb-1"
              >
                Monthly Income (BDT)
              </label>
              <input
                id="monthly-income"
                type="number"
                min="1000"
                step="500"
                required
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 75000"
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="emergency-contact"
                className="block text-xs uppercase font-medium text-slate-400 mb-1"
              >
                Emergency Contact (11 digits, starts 01)
              </label>
              <input
                id="emergency-contact"
                type="tel"
                maxLength={11}
                required
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={tenantLoading}
              className="mt-2 w-full bg-white text-slate-900 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
            >
              {tenantLoading ? "Registering..." : "Save Tenant Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
