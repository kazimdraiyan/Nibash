import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ContractFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const initialListingId = searchParams.get("listingId") || "";
  const initialTenantId = searchParams.get("tenantId") || "";

  // Contract form states
  const [listingId, setListingId] = useState(initialListingId);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2027-09-30");

  // Financial Terms
  const [rent, setRent] = useState("65000");
  const [electricityBill, setElectricityBill] = useState("3500");
  const [waterBill, setWaterBill] = useState("1200");
  const [serviceCharge, setServiceCharge] = useState("5000");
  const [monthlyDueDate, setMonthlyDueDate] = useState("5");
  const [securityDeposit, setSecurityDeposit] = useState("130000");
  const [petAllowed, setPetAllowed] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (new Date(startDate) >= new Date(endDate)) {
      setError("End date must be strictly after the start date.");
      return;
    }

    setLoading(true);
    const payload = {
      listing_id: Number(listingId),
      tenant_id: Number(tenantId),
      start_date: startDate,
      end_date: endDate,
      rent: Number(rent),
      electricity_bill: Number(electricityBill),
      water_bill: Number(waterBill),
      service_charge: Number(serviceCharge),
      monthly_due_date: Number(monthlyDueDate),
      security_deposit: Number(securityDeposit),
      pet_allowed: Boolean(petAllowed),
    };

    try {
      const res = await apiClient.post<{ message: string; contractId: number }>("/contracts", payload);
      alert(res.message || "Contract proposed successfully!");
      navigate(`/contracts/${res.contractId}`);
    } catch (err: any) {
      setError(err.message || "Failed to propose contract.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          You must be logged in as the property owner to propose a lease contract.
        </p>
        <Link to="/login" className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link to="/owner/applications" className="text-xs text-slate-400 hover:text-white">
          ← Back to Applications
        </Link>
      </div>

      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Propose Digital Lease Contract</h1>
        <p className="text-xs text-slate-400 mb-6">
          Specify agreement duration and financial obligations for the approved tenant.
        </p>

        {error && (
          <div className="p-3 mb-6 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contract-listing-id"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Listing ID *
              </label>
              <input
                id="contract-listing-id"
                type="number"
                required
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="contract-tenant-id"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Tenant ID *
              </label>
              <input
                id="contract-tenant-id"
                type="number"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contract-start-date"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Start Date *
              </label>
              <input
                id="contract-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="contract-end-date"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                End Date *
              </label>
              <input
                id="contract-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label
                htmlFor="contract-rent"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Monthly Rent (BDT) *
              </label>
              <input
                id="contract-rent"
                type="number"
                min="1000"
                step="500"
                required
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contract-security-deposit"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Security Deposit (BDT) *
              </label>
              <input
                id="contract-security-deposit"
                type="number"
                min="0"
                step="500"
                required
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contract-electricity"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Electricity Bill (BDT) *
              </label>
              <input
                id="contract-electricity"
                type="number"
                min="0"
                required
                value={electricityBill}
                onChange={(e) => setElectricityBill(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contract-water"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Water Bill (BDT) *
              </label>
              <input
                id="contract-water"
                type="number"
                min="0"
                required
                value={waterBill}
                onChange={(e) => setWaterBill(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contract-service"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Service Charge (BDT) *
              </label>
              <input
                id="contract-service"
                type="number"
                min="0"
                required
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="contract-due-date"
                className="block text-xs uppercase font-medium text-slate-300 mb-1"
              >
                Monthly Due Date (1 - 28) *
              </label>
              <input
                id="contract-due-date"
                type="number"
                min="1"
                max="28"
                required
                value={monthlyDueDate}
                onChange={(e) => setMonthlyDueDate(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="contract-pet-allowed"
              type="checkbox"
              checked={petAllowed}
              onChange={(e) => setPetAllowed(e.target.checked)}
              className="w-4 h-4 rounded text-black accent-black cursor-pointer"
            />
            <label htmlFor="contract-pet-allowed" className="text-sm text-slate-300 cursor-pointer">
              Pets Allowed under this contract
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? "Proposing Contract..." : "Send Contract Proposal to Tenant"}
          </button>
        </form>
      </div>
    </div>
  );
}
