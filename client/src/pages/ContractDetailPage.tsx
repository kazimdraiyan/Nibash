import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ContractData {
  contract_id: number;
  tenant_id: number;
  listing_id: number;
  agreement_id: number;
  status: string; // 'proposed' | 'signed' | 'active' | 'completed'
  start_date: string;
  end_date: string;
  paid_security_deposit: boolean;
  rent: number;
  electricity_bill: number;
  water_bill: number;
  service_charge: number;
  monthly_due_date: number;
  pet_allowed: boolean;
  security_deposit: number;
  listing_title?: string;
  owner_id?: number;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  monthly_income?: number | string;
  emergency_contact?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
}

interface PaymentRecord {
  id: number;
  contract_id: number;
  amount: string | number;
  payment_method: string | null;
  status: string; // 'pending' | 'overdue' | 'confirmed' | 'failed'
  billing_month?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  bkash_transaction_id?: string | null;
  sslcommerz_transaction_id?: string | null;
}

function formatMonth(dateStr?: string | null): string {
  if (!dateStr) return "Current Month";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDueDate(day: number | string) {
  const d = typeof day === "string" ? parseInt(day, 10) : day;
  if (isNaN(d)) return `${day}th of each month`;
  const j = d % 10;
  const k = d % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  else if (j === 2 && k !== 12) suffix = "nd";
  else if (j === 3 && k !== 13) suffix = "rd";
  return `${d}${suffix} of each month`;
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tenant Cash Payment action state
  const [payingCash, setPayingCash] = useState(false);

  // Owner resolution / reject action state
  const [resolvingPaymentId, setResolvingPaymentId] = useState<number | null>(null);
  const [rejectingCashId, setRejectingCashId] = useState<number | null>(null);

  // Signing state
  const [signing, setSigning] = useState(false);

  const fetchContractAndPayments = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Contract Details
      const res = await apiClient.get<{ contract: ContractData }>(`/contracts/${id}`);
      setContract(res.contract);

      // 2. Fetch Payments for this contract
      try {
        const payRes = await apiClient.get<{ payments: PaymentRecord[] }>(`/payments/contracts/${id}`);
        setPayments(payRes.payments || []);
      } catch {
        setPayments([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load contract details.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchContractAndPayments();
  }, [fetchContractAndPayments]);

  const handleSignContract = async () => {
    if (!id || !confirm("Are you sure you want to sign this digital lease contract?")) return;
    setSigning(true);
    try {
      await apiClient.patch(`/contracts/${id}`, { status: "signed" });
      alert("Contract signed successfully!");
      fetchContractAndPayments();
    } catch (err: any) {
      alert(err.message || "Failed to sign contract.");
    } finally {
      setSigning(false);
    }
  };

  const handlePayByCash = async (paymentId: number) => {
    if (!confirm("Are you sure you want to mark this rental payment as Paid by Cash?")) return;
    setPayingCash(true);
    try {
      await apiClient.patch(`/payments/${paymentId}/pay-cash`, {});
      await fetchContractAndPayments();
    } catch (err: any) {
      alert(err.message || "Failed to mark payment as paid by cash.");
    } finally {
      setPayingCash(false);
    }
  };

  const handleResolvePayment = async (paymentId: number, status: "confirmed" | "failed") => {
    const actionText = status === "confirmed" ? "confirm" : "fail";
    if (!confirm(`Are you sure you want to ${actionText} this payment?`)) return;
    setResolvingPaymentId(paymentId);
    try {
      await apiClient.patch(`/payments/${paymentId}`, { status });
      await fetchContractAndPayments();
    } catch (err: any) {
      alert(err.message || "Failed to update payment status.");
    } finally {
      setResolvingPaymentId(null);
    }
  };

  const handleRejectCash = async (paymentId: number) => {
    if (!confirm("Are you sure you didn't receive this cash payment? This will reset the payment method and notify the tenant to pay.")) return;
    setRejectingCashId(paymentId);
    try {
      await apiClient.patch(`/payments/${paymentId}/reject-cash`, {});
      await fetchContractAndPayments();
    } catch (err: any) {
      alert(err.message || "Failed to reset payment method.");
    } finally {
      setRejectingCashId(null);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          You must be logged in to view and manage contract agreements.
        </p>
        <Link to="/login" className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium">
          Log In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-10 h-10 rounded-full border-2 border-[#d4b068]/60 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-white font-medium mb-1">Loading digital contract details...</p>
        <p className="text-xs text-slate-500">Retrieving agreement terms, counterpart details, and payment logs</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg mb-4 text-sm">
          {error || "Contract not found or you are not authorized to view it."}
        </div>
        <Link to="/listings" className="inline-block bg-slate-800 text-white px-4 py-2 rounded text-xs hover:bg-slate-700">
          Browse Apartments
        </Link>
      </div>
    );
  }

  const isTenant = Boolean(user && user.id === contract.tenant_id);
  const isOwner = Boolean(user && user.id === contract.owner_id);

  // Find due payments (pending OR overdue)
  const duePayments = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const earliestDuePayment = duePayments[0] || null;

  // Confirmed payments for history list
  const confirmedPayments = payments.filter((p) => p.status === "confirmed");

  // Monthly totals
  const totalMonthlyCommitment =
    Number(contract.rent || 0) +
    Number(contract.electricity_bill || 0) +
    Number(contract.water_bill || 0) +
    Number(contract.service_charge || 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-[75vh]">
      {/* Top Header / Breadcrumb navigation */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to={isOwner ? "/my-listings" : "/listings"}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>{isOwner ? "Back to My Listings" : "Back to Listings"}</span>
          </Link>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-xs font-mono text-[#d4b068] bg-[#d4b068]/15 border border-[#d4b068]/30 px-2 py-0.5 rounded">
            Contract #{contract.contract_id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs uppercase font-mono px-3 py-1 rounded-full font-semibold border flex items-center gap-1.5 ${
              contract.status === "signed" || contract.status === "active"
                ? "bg-emerald-950 text-emerald-300 border-emerald-800 shadow-xs"
                : contract.status === "completed"
                ? "bg-blue-950 text-blue-300 border-blue-800"
                : "bg-amber-950 text-amber-300 border-amber-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                contract.status === "signed" || contract.status === "active"
                  ? "bg-emerald-400"
                  : contract.status === "completed"
                  ? "bg-blue-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            {contract.status === "signed" ? "Active Lease" : contract.status}
          </span>
        </div>
      </div>

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAIN COLUMN (8 Columns on desktop): Listing Link, Counterpart Details, Agreement Terms, Payments */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* 1. Property / Listing Reference Banner */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#d4b068] block mb-1">
                  Associated Property
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {contract.listing_title || `Apartment #${contract.listing_id}`}
                </h1>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>Listing ID: #{contract.listing_id}</span>
                  <span>•</span>
                  <span>Agreement #{contract.agreement_id}</span>
                </p>
              </div>

              <Link
                to={`/listings/${contract.listing_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1d222e] hover:bg-[#252c3c] text-white border border-slate-700 hover:border-slate-500 transition self-start sm:self-center"
              >
                <span>View Full Listing</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
            </div>
          </div>

          {/* 2. Counterpart Details Section:
                 - When logged in as OWNER: Show Tenant Information
                 - When logged in as TENANT: Show Property Owner Information here
          */}
          {isOwner ? (
            /* Tenant Information Card (for Owner) */
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-[#d4b068]">
                    person
                  </span>
                  <h2 className="text-base font-bold text-white">Tenant Information</h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-600/50">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>Verified Tenant</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-sm">
                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Full Name
                  </span>
                  <span className="font-medium text-white">
                    {contract.tenant_name || `Tenant #${contract.tenant_id}`}
                  </span>
                </div>

                {contract.tenant_email && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Email Address
                    </span>
                    <span className="font-mono text-white text-xs truncate block">
                      {contract.tenant_email}
                    </span>
                  </div>
                )}

                {contract.tenant_phone && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Contact Phone
                    </span>
                    <span className="font-mono text-white text-xs">
                      {contract.tenant_phone}
                    </span>
                  </div>
                )}

                {contract.monthly_income && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Verified Income
                    </span>
                    <span className="font-mono text-white font-medium">
                      ৳{Number(contract.monthly_income).toLocaleString()} / month
                    </span>
                  </div>
                )}

                {contract.emergency_contact && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Emergency Contact
                    </span>
                    <span className="font-mono text-white text-xs">
                      {contract.emergency_contact}
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Tenant Reference
                  </span>
                  <span className="font-mono text-slate-300 text-xs">
                    User #{contract.tenant_id}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Property Owner Information Card (for Tenant or third-party) */
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-[#d4b068]">
                    shield_person
                  </span>
                  <h2 className="text-base font-bold text-white">Property Owner</h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-600/50">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>Registered Landlord</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-sm">
                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Owner Name
                  </span>
                  <span className="font-medium text-white">
                    {contract.owner_name || `Owner #${contract.owner_id}`}
                  </span>
                </div>

                {contract.owner_email && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Email Address
                    </span>
                    <span className="font-mono text-white text-xs truncate block">
                      {contract.owner_email}
                    </span>
                  </div>
                )}

                {contract.owner_phone && (
                  <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                      Contact Phone
                    </span>
                    <span className="font-mono text-white text-xs">
                      {contract.owner_phone}
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#090a0c] border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Owner Reference
                  </span>
                  <span className="font-mono text-slate-300 text-xs">
                    User #{contract.owner_id}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Lease Agreement (Terms) of this contract */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <span className="material-symbols-outlined text-lg text-[#d4b068]">
                receipt_long
              </span>
              <span>Agreement Terms & Financial Breakdown</span>
            </h2>

            <div className="divide-y divide-slate-800/80 text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400 font-medium">Monthly Rent</span>
                <span className="text-white font-mono font-bold text-base">
                  ৳{Number(contract.rent).toLocaleString()} / month
                </span>
              </div>

              {contract.electricity_bill !== undefined &&
                contract.electricity_bill !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400 font-medium">Electricity Bill</span>
                    <span className="text-slate-200 font-mono">
                      ৳{Number(contract.electricity_bill).toLocaleString()}
                    </span>
                  </div>
                )}

              {contract.water_bill !== undefined &&
                contract.water_bill !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400 font-medium">Water Bill</span>
                    <span className="text-slate-200 font-mono">
                      ৳{Number(contract.water_bill).toLocaleString()}
                    </span>
                  </div>
                )}

              {contract.service_charge !== undefined &&
                contract.service_charge !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400 font-medium">Service Charge</span>
                    <span className="text-slate-200 font-mono">
                      ৳{Number(contract.service_charge).toLocaleString()}
                    </span>
                  </div>
                )}

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400 font-medium">Security Deposit</span>
                <div className="text-right">
                  <span className="text-slate-200 font-mono font-medium block">
                    ৳{Number(contract.security_deposit).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {contract.paid_security_deposit ? "✓ Verified Deposited" : "Pending one-time deposit"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400 font-medium">Monthly Due Date</span>
                <span className="text-slate-200 font-medium">
                  {formatDueDate(contract.monthly_due_date)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400 font-medium">Pet Policy</span>
                <span
                  className={`font-medium px-2.5 py-0.5 rounded-full text-xs ${
                    contract.pet_allowed
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {contract.pet_allowed ? "Pets Allowed" : "No Pets Allowed"}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Payments Section */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-[#d4b068]">
                    payments
                  </span>
                  <span>Payments</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly rental payment log, due dates, and verification records.
                </p>
              </div>

              {duePayments.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-center border ${
                    earliestDuePayment?.status === "overdue"
                      ? "bg-rose-950/80 text-rose-300 border-rose-600/60"
                      : "bg-amber-950/80 text-amber-300 border-amber-600/60"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      earliestDuePayment?.status === "overdue"
                        ? "bg-rose-400 animate-ping"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  <span>
                    {earliestDuePayment?.status === "overdue"
                      ? `${duePayments.length} Payment Overdue`
                      : `${duePayments.length} Payment Due`}
                  </span>
                </span>
              )}
            </div>

            {/* EMPHASIZED ACTIVE DUE / OVERDUE PAYMENT CARD */}
            {earliestDuePayment && (
              <div
                className={`mb-6 p-5 sm:p-6 rounded-2xl border-2 shadow-lg relative overflow-hidden ${
                  earliestDuePayment.status === "overdue"
                    ? "bg-gradient-to-r from-[#220f13] via-[#1a0f14] to-[#12151c] border-rose-500/60"
                    : "bg-gradient-to-r from-[#17140f] to-[#12151c] border-amber-500/50"
                }`}
              >
                <div
                  className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
                    earliestDuePayment.status === "overdue" ? "bg-rose-500/10" : "bg-amber-500/5"
                  }`}
                />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {earliestDuePayment.status === "overdue" ? (
                        <span className="text-xs uppercase font-mono tracking-wider font-semibold text-rose-300 bg-rose-950/90 border border-rose-500/60 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                          Payment Overdue
                        </span>
                      ) : (
                        <span className="text-xs uppercase font-mono tracking-wider font-semibold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Active Due Payment
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-300">
                        {formatMonth(earliestDuePayment.billing_month)}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                        ৳{Number(earliestDuePayment.amount).toLocaleString()}
                      </span>
                      <span
                        className={`text-xs ${
                          earliestDuePayment.status === "overdue"
                            ? "text-rose-300 font-medium"
                            : "text-slate-400"
                        }`}
                      >
                        {earliestDuePayment.status === "overdue"
                          ? `was due on ${formatDate(earliestDuePayment.due_date)}`
                          : `due by ${formatDate(earliestDuePayment.due_date)}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Billing Cycle: 1st of month • Covers monthly rent and utilities
                    </p>
                  </div>

                  {/* Tenant action / status */}
                  {isTenant && (
                    <div className="w-full md:w-auto">
                      {earliestDuePayment.payment_method === "Cash" ? (
                        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-medium">
                          <span className="material-symbols-outlined text-base">hourglass_top</span>
                          <span>Awaiting verification of owner</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={payingCash}
                          onClick={() => handlePayByCash(earliestDuePayment.id)}
                          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-base">payments</span>
                          <span>{payingCash ? "Submitting..." : "Paid by Cash"}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Owner resolution controls on emphasized card */}
                  {isOwner && (
                    <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-2.5">
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <span>Payment Method:</span>
                        {earliestDuePayment.payment_method === "Cash" ? (
                          <span className="font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded font-mono">
                            Claimed Cash
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Paid</span>
                        )}
                      </div>

                      {/* If claimed cash: Show Confirm Payment AND Didn't Receive */}
                      {earliestDuePayment.payment_method === "Cash" && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={resolvingPaymentId === earliestDuePayment.id || rejectingCashId === earliestDuePayment.id}
                            onClick={() => handleResolvePayment(earliestDuePayment.id, "confirmed")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>Confirm Payment</span>
                          </button>
                          <button
                            type="button"
                            disabled={resolvingPaymentId === earliestDuePayment.id || rejectingCashId === earliestDuePayment.id}
                            onClick={() => handleRejectCash(earliestDuePayment.id)}
                            className="bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/50 px-3.5 py-2 rounded-lg text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                            <span>Didn't Receive</span>
                          </button>
                        </div>
                      )}

                      {/* If method is null: No Fail or Didn't Receive button. Clean status note and optional manual confirmation */}
                      {!earliestDuePayment.payment_method && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 italic bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                            Awaiting tenant payment
                          </span>
                          <button
                            type="button"
                            disabled={resolvingPaymentId === earliestDuePayment.id}
                            onClick={() => handleResolvePayment(earliestDuePayment.id, "confirmed")}
                            className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-1 rounded text-xs transition cursor-pointer disabled:opacity-50"
                            title="Confirm if cash was handed directly in person"
                          >
                            Received Direct Cash
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compact Payment History List (ONLY CONFIRMED PAYMENTS) */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 font-mono">
                Confirmed Payment History ({confirmedPayments.length})
              </h3>

              {confirmedPayments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-[#090a0c]/50">
                  <span className="material-symbols-outlined text-2xl text-slate-600 block mb-1">
                    receipt
                  </span>
                  No confirmed payments recorded for this contract yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {confirmedPayments.map((pmt) => (
                    <div
                      key={pmt.id}
                      className="p-3.5 sm:p-4 rounded-xl border bg-[#090a0c] border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-emerald-950/60 border-emerald-700/50 text-emerald-400">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-bold text-white font-mono">
                              ৳{Number(pmt.amount).toLocaleString()}
                            </span>
                            <span className="text-xs font-medium text-slate-300">
                              • {formatMonth(pmt.billing_month)}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Confirmed
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>
                              Method:{" "}
                              <strong className="text-slate-200">
                                {pmt.payment_method || "Cash"}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>Paid at: {formatDate(pmt.paid_at || pmt.due_date)}</span>
                            {pmt.bkash_transaction_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-400">
                                  bKash: {pmt.bkash_transaction_id}
                                </span>
                              </>
                            )}
                            {pmt.sslcommerz_transaction_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-400">
                                  SSL: {pmt.sslcommerz_transaction_id}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-emerald-400 font-mono font-medium self-end sm:self-center flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>Paid & Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR COLUMN (4 Columns on desktop): Status, Dates, Financial Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
          {/* Contract Status & Duration Card */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#d4b068]">
                assignment_turned_in
              </span>
              <span>Lease Status & Timeline</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-slate-400">Current Status</span>
                <span className="font-semibold text-white uppercase font-mono">
                  {contract.status}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-slate-400">Lease Start</span>
                <span className="font-semibold text-white font-mono">
                  {formatDate(contract.start_date)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-slate-400">Lease End</span>
                <span className="font-semibold text-white font-mono">
                  {formatDate(contract.end_date)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1">
                <span className="text-slate-400">Payment Starts</span>
                <span className="font-medium text-slate-200">
                  1st of next month
                </span>
              </div>
            </div>

            {/* Sign Contract CTA if proposed */}
            {isTenant && contract.status === "proposed" && (
              <button
                type="button"
                onClick={handleSignContract}
                disabled={signing}
                className="mt-5 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {signing ? "Signing Contract..." : "Sign Digital Contract"}
              </button>
            )}
          </div>

          {/* Monthly Obligations Breakdown */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#d4b068]">
                account_balance_wallet
              </span>
              <span>Financial Overview</span>
            </h3>

            <div className="space-y-2.5 text-xs pb-4 border-b border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400">
                <span>Base Rent</span>
                <span className="text-white font-mono">৳{Number(contract.rent).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Electricity</span>
                <span className="text-white font-mono">৳{Number(contract.electricity_bill || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Water</span>
                <span className="text-white font-mono">৳{Number(contract.water_bill || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Service Charge</span>
                <span className="text-white font-mono">৳{Number(contract.service_charge || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3.5 flex items-center justify-between text-sm">
              <span className="font-bold text-white">Total Monthly</span>
              <span className="font-extrabold text-[#d4b068] font-mono text-base">
                ৳{totalMonthlyCommitment.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
