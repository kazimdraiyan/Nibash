import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ReviewModal, type ReviewData } from "../components/ReviewModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";

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

  // Tenant review state
  const [review, setReview] = useState<ReviewData | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [reviewPhotoViewer, setReviewPhotoViewer] = useState<{
    photos: { id: number; url: string }[];
    selectedIndex: number;
  } | null>(null);

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

      // 3. Fetch Review for this contract
      try {
        const revRes = await apiClient.get<{ review: ReviewData | null }>(`/reviews/contract/${id}`);
        setReview(revRes.review || null);
      } catch {
        setReview(null);
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

  useEffect(() => {
    if (!reviewPhotoViewer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReviewPhotoViewer(null);
      if (e.key === "ArrowLeft" && reviewPhotoViewer.photos.length > 1) {
        setReviewPhotoViewer((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex:
                  prev.selectedIndex === 0
                    ? prev.photos.length - 1
                    : prev.selectedIndex - 1,
              }
            : null
        );
      }
      if (e.key === "ArrowRight" && reviewPhotoViewer.photos.length > 1) {
        setReviewPhotoViewer((prev) =>
          prev
            ? {
                ...prev,
                selectedIndex:
                  prev.selectedIndex === prev.photos.length - 1
                    ? 0
                    : prev.selectedIndex + 1,
              }
            : null
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewPhotoViewer]);

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

  const handleReviewSaved = (savedReview: ReviewData) => {
    setReview(savedReview);
  };

  const handleDeleteReview = async () => {
    if (!review) return;
    setIsDeletingReview(true);
    try {
      await apiClient.delete(`/reviews/${review.id}`);
      setReview(null);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to delete review.");
    } finally {
      setIsDeletingReview(false);
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
        <div className="w-10 h-10 rounded-full border-2 border-slate/60 border-t-transparent animate-spin mx-auto mb-4" />
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
  const hasConfirmedPayment = confirmedPayments.length > 0;

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
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {contract.listing_title || `Apartment #${contract.listing_id}`}
                </h1>
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
                  <span className="material-symbols-outlined text-xl text-slate">
                    person
                  </span>
                  <h2 className="text-base font-bold text-white">Tenant Information</h2>
                </div>
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
              </div>
            </div>
          ) : (
            /* Property Owner Information Card (for Tenant or third-party) */
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-slate">
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
              <span className="material-symbols-outlined text-lg text-slate">
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
                  <span className="material-symbols-outlined text-lg text-slate">
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

          {/* 5. Tenancy Review Section (for Tenants) */}
          {isTenant && (
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-slate">
                    hotel_class
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white">Tenancy & Landlord Review</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Share your living experience to help prospective tenants
                    </p>
                  </div>
                </div>

                {review && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 self-start sm:self-center">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span>Review Submitted</span>
                  </span>
                )}
              </div>

              {!review ? (
                /* No review submitted yet */
                <div className="p-6 rounded-xl bg-[#090a0c] border border-dashed border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="max-w-md">
                    <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <span>Rate Your Experience</span>
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-950/70 border border-amber-600/40 px-2 py-0.5 rounded">
                        1–5 Stars
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Your feedback on the apartment and tenancy will appear on the listing page. You can add a description and photos of the apartment.
                    </p>
                  </div>

                  <div className="relative group self-stretch sm:self-auto flex flex-col sm:items-end">
                    <button
                      type="button"
                      disabled={!hasConfirmedPayment}
                      onClick={() => {
                        if (hasConfirmedPayment) setIsReviewModalOpen(true);
                      }}
                      className={`w-full sm:w-auto font-semibold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                        hasConfirmedPayment
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
                          : "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-75"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">rate_review</span>
                      <span>Write a Review</span>
                    </button>

                    {/* Tooltip for disabled state */}
                    {!hasConfirmedPayment && (
                      <div className="pointer-events-none absolute bottom-full mb-2 right-0 hidden group-hover:flex flex-col items-center z-30 w-64 text-center">
                        <div className="bg-[#1e2330] text-amber-200 text-xs py-1.5 px-3 rounded-lg border border-amber-500/30 shadow-xl font-medium">
                          You must have at least 1 successful payment to write a review
                        </div>
                        <div className="w-2 h-2 bg-[#1e2330] rotate-45 -mt-1 border-r border-b border-amber-500/30" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Review submitted - display card with Edit & Delete options */
                <div className="p-5 sm:p-6 rounded-xl bg-[#090a0c] border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center text-amber-400 text-base">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`material-symbols-outlined text-lg ${
                              star <= review.rating ? "font-variation-fill" : "text-slate-700"
                            }`}
                            style={{
                              fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                        {review.rating}.0 / 5.0
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        Submitted on {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>

                  {review.description ? (
                    <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed mb-4">
                      {review.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic mb-4">
                      No written description provided.
                    </p>
                  )}

                  {/* Review Photos Thumbnail Grid */}
                  {review.media && review.media.length > 0 && (
                    <div className="mb-5">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-2">
                        Attached Photos ({review.media.length})
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {review.media.map((img, idx) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() =>
                              setReviewPhotoViewer({
                                photos: review.media,
                                selectedIndex: idx,
                              })
                            }
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-700/80 hover:border-amber-400/80 transition-all hover:scale-105 group cursor-pointer shadow-sm"
                          >
                            <img
                              src={img.url}
                              alt={`Review photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="material-symbols-outlined text-lg">fullscreen</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit Review</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>Delete Review</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR COLUMN (4 Columns on desktop): Status, Dates, Financial Summary */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
          {/* Contract Status & Duration Card */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-slate">
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
              <span className="material-symbols-outlined text-base text-slate">
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
              <span className="font-extrabold text-slate font-mono text-base">
                ৳{totalMonthlyCommitment.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {contract && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          contractId={contract.contract_id}
          listingTitle={contract.listing_title}
          initialReview={review}
          onReviewSaved={handleReviewSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteReview}
        isDeleting={isDeletingReview}
        title="Delete Your Review?"
        message="Are you sure you want to permanently delete your review and photos? This action cannot be undone."
      />

      {/* Fullscreen Review Photo Lightbox */}
      {reviewPhotoViewer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-fadeIn"
          onClick={() => setReviewPhotoViewer(null)}
        >
          {/* Lightbox Top Bar */}
          <div
            className="flex items-center justify-between w-full max-w-6xl mx-auto text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold truncate max-w-xs sm:max-w-md text-white">
                Review Photo {reviewPhotoViewer.selectedIndex + 1} of {reviewPhotoViewer.photos.length}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setReviewPhotoViewer(null)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close fullscreen image"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Lightbox Main Image & Arrows */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={reviewPhotoViewer.photos[reviewPhotoViewer.selectedIndex]?.url}
              alt={`Review photo ${reviewPhotoViewer.selectedIndex + 1}`}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
            />

            {reviewPhotoViewer.photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setReviewPhotoViewer((prev) =>
                      prev
                        ? {
                            ...prev,
                            selectedIndex:
                              prev.selectedIndex === 0
                                ? prev.photos.length - 1
                                : prev.selectedIndex - 1,
                          }
                        : null
                    )
                  }
                  className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Previous photo"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_left</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReviewPhotoViewer((prev) =>
                      prev
                        ? {
                            ...prev,
                            selectedIndex:
                              prev.selectedIndex === prev.photos.length - 1
                                ? 0
                                : prev.selectedIndex + 1,
                          }
                        : null
                    )
                  }
                  className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-black/70 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition cursor-pointer shadow-xl"
                  aria-label="Next photo"
                >
                  <span className="material-symbols-outlined text-2xl">chevron_right</span>
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {reviewPhotoViewer.photos.length > 1 && (
            <div
              className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 overflow-x-auto p-2"
              onClick={(e) => e.stopPropagation()}
            >
              {reviewPhotoViewer.photos.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() =>
                    setReviewPhotoViewer((prev) => (prev ? { ...prev, selectedIndex: idx } : null))
                  }
                  className={`w-14 h-14 rounded-lg overflow-hidden border transition cursor-pointer ${
                    idx === reviewPhotoViewer.selectedIndex
                      ? "ring-2 ring-white border-white scale-105"
                      : "border-slate-800 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
