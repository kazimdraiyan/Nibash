import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface ContractData {
  contract_id: number;
  tenant_id: number;
  listing_id: number;
  agreement_id: number;
  status: string; // 'proposed' | 'signed' | 'active' | 'completed' | 'cancelled'
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
  owner_id?: number;
}

interface PaymentRecord {
  id: number;
  contract_id: number;
  amount: string | number;
  payment_method: string;
  status: string; // 'pending' | 'confirmed' | 'failed'
  bkash_transaction_id?: string;
  sslcommerz_transaction_id?: string;
  created_at?: string;
  paid_at?: string;
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signing state
  const [signing, setSigning] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"Cash" | "bKash" | "SSLCommerz">("bKash");
  const [bKashTx, setBKashTx] = useState("");
  const [sslTx, setSslTx] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Review form state
  const [rating, setRating] = useState("5");
  const [reviewDesc, setReviewDesc] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchContractAndPayments = useCallback(async () => {
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Contract
      const res = await apiClient.get<{ contract: ContractData }>(`/contracts/${id}`);
      setContract(res.contract);
      setPayAmount(String(res.contract.rent || ""));

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
    if (!id || !confirm("Are you sure you want to sign this digital contract?")) return;
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

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !id) return;
    setPaying(true);
    setPaymentMsg(null);

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentMsg({ text: "Please enter a valid payment amount.", isError: true });
      setPaying(false);
      return;
    }

    const body: Record<string, any> = {
      contract_id: Number(id),
      amount: amt,
      payment_method: payMethod,
    };

    if (payMethod === "bKash" && bKashTx.trim()) {
      body.bKash_transaction_id = bKashTx.trim();
    }
    if (payMethod === "SSLCommerz" && sslTx.trim()) {
      body.SSLCommerz_transaction_id = sslTx.trim();
    }

    try {
      const res = await apiClient.post<{ message: string }>("/payments", body);
      setPaymentMsg({ text: res.message || "Payment submitted successfully!", isError: false });
      setBKashTx("");
      setSslTx("");
      fetchContractAndPayments();
    } catch (err: any) {
      setPaymentMsg({ text: err.message || "Failed to post payment.", isError: true });
    } finally {
      setPaying(false);
    }
  };

  const handleResolvePayment = async (paymentId: number, status: "confirmed" | "failed") => {
    if (!confirm(`Are you sure you want to mark this payment as ${status}?`)) return;
    try {
      await apiClient.patch(`/payments/${paymentId}`, { status });
      alert(`Payment marked as ${status}!`);
      fetchContractAndPayments();
    } catch (err: any) {
      alert(err.message || "Failed to update payment status.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingReview(true);
    setReviewMsg(null);

    if (reviewDesc.trim().length < 10) {
      setReviewMsg({ text: "Review description must be at least 10 characters.", isError: true });
      setSubmittingReview(false);
      return;
    }

    try {
      const res = await apiClient.post<{ message: string }>("/reviews", {
        contract_id: Number(id),
        rating: Number(rating),
        description: reviewDesc.trim(),
      });
      setReviewMsg({ text: res.message || "Review submitted successfully!", isError: false });
      setReviewDesc("");
    } catch (err: any) {
      setReviewMsg({ text: err.message || "Failed to post review.", isError: true });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          You must be logged in to view and manage contracts.
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
        <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading digital contract details...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg mb-4 text-sm">
          {error || "Contract not found or not authorized."}
        </div>
        <Link to="/listings" className="inline-block bg-slate-800 text-white px-4 py-2 rounded text-xs">
          Browse Residences
        </Link>
      </div>
    );
  }

  const isTenant = user && user.id === contract.tenant_id;
  const isOwner = user && !isTenant; // User authorized on this contract who is not the tenant

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link to="/owner/applications" className="text-xs text-slate-400 hover:text-white">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Contract #{contract.contract_id}</span>
          <span
            className={`text-xs uppercase font-mono px-2.5 py-1 rounded font-semibold ${
              contract.status === "signed" || contract.status === "active"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : contract.status === "completed"
                ? "bg-blue-950 text-blue-300 border border-blue-800"
                : "bg-amber-950 text-amber-300 border border-amber-800"
            }`}
          >
            {contract.status}
          </span>
        </div>
      </div>

      {/* Contract Terms Banner */}
      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Digital Lease Agreement
            </h1>
            <p className="text-xs text-slate-400">
              Listing ID: #{contract.listing_id} • Tenant ID: #{contract.tenant_id}
            </p>
          </div>

          {/* Tenant Sign Action */}
          {isTenant && contract.status === "proposed" && (
            <button
              type="button"
              onClick={handleSignContract}
              disabled={signing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
            >
              {signing ? "Signing..." : "Sign Digital Contract"}
            </button>
          )}
        </div>

        {/* Date & Terms Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#090a0c] border border-slate-800 text-center mb-6">
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5">Lease Start</span>
            <span className="text-sm font-semibold text-white">
              {new Date(contract.start_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5">Lease End</span>
            <span className="text-sm font-semibold text-white">
              {new Date(contract.end_date).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5">Monthly Due Date</span>
            <span className="text-sm font-semibold text-white">
              Day {contract.monthly_due_date} of month
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase text-slate-500 mb-0.5">Deposit Status</span>
            <span className="text-sm font-semibold text-white">
              {contract.paid_security_deposit ? "✓ Paid" : "Unpaid"}
            </span>
          </div>
        </div>

        {/* Financial Obligations */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center border-t border-slate-800/80 pt-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Monthly Rent</span>
            <span className="text-sm font-bold text-white">৳{Number(contract.rent).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Deposit</span>
            <span className="text-sm font-bold text-white">৳{Number(contract.security_deposit).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Electricity</span>
            <span className="text-sm font-bold text-white">৳{Number(contract.electricity_bill).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Water</span>
            <span className="text-sm font-bold text-white">৳{Number(contract.water_bill).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Service Charge</span>
            <span className="text-sm font-bold text-white">৳{Number(contract.service_charge).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Two Column Bottom Section: Payments and Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Payments Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Payment History Card */}
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">Contract Payments</h2>
            <p className="text-xs text-slate-400 mb-4">
              Log of rental payments and verification status.
            </p>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No payments recorded for this contract yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map((pmt) => (
                  <div
                    key={pmt.id}
                    className="p-4 bg-[#090a0c] border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">
                          ৳{Number(pmt.amount).toLocaleString()}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          via {pmt.payment_method}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                            pmt.status === "confirmed"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : pmt.status === "failed"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {pmt.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {pmt.bkash_transaction_id && `bKash Tx: ${pmt.bkash_transaction_id}`}
                        {pmt.sslcommerz_transaction_id && `SSL Tx: ${pmt.sslcommerz_transaction_id}`}
                        {pmt.created_at && ` • ${new Date(pmt.created_at).toLocaleDateString()}`}
                      </div>
                    </div>

                    {/* Owner resolution controls for pending payments */}
                    {isOwner && pmt.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolvePayment(pmt.id, "confirmed")}
                          className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 px-2.5 py-1 rounded text-xs cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolvePayment(pmt.id, "failed")}
                          className="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 px-2.5 py-1 rounded text-xs cursor-pointer"
                        >
                          Fail
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tenant Submit Payment Form */}
          {isTenant && contract.status === "signed" && (
            <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">Make Rent Payment</h2>
              <p className="text-xs text-slate-400 mb-4">
                Amount must equal your exact monthly rent (৳{contract.rent}).
              </p>

              {paymentMsg && (
                <div
                  className={`p-3 mb-4 rounded text-xs ${
                    paymentMsg.isError
                      ? "bg-red-950/60 border border-red-800 text-red-300"
                      : "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                  }`}
                >
                  {paymentMsg.text}
                </div>
              )}

              <form onSubmit={handleMakePayment} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="payment-amount"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      Amount (BDT) *
                    </label>
                    <input
                      id="payment-amount"
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="payment-method"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      Payment Method *
                    </label>
                    <select
                      id="payment-method"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="bKash">bKash</option>
                      <option value="SSLCommerz">SSLCommerz</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>

                {payMethod === "bKash" && (
                  <div>
                    <label
                      htmlFor="payment-bkash-tx"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      bKash Transaction ID
                    </label>
                    <input
                      id="payment-bkash-tx"
                      type="text"
                      value={bKashTx}
                      onChange={(e) => setBKashTx(e.target.value)}
                      placeholder="e.g. 9J4K2L1A"
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {payMethod === "SSLCommerz" && (
                  <div>
                    <label
                      htmlFor="payment-ssl-tx"
                      className="block text-xs uppercase font-medium text-slate-400 mb-1"
                    >
                      SSLCommerz Transaction ID
                    </label>
                    <input
                      id="payment-ssl-tx"
                      type="text"
                      value={sslTx}
                      onChange={(e) => setSslTx(e.target.value)}
                      placeholder="e.g. SSL-9821812"
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={paying}
                  className="w-full bg-white text-slate-900 font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
                >
                  {paying ? "Submitting Payment..." : "Submit Payment Record"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Reviews Column */}
        <div className="lg:col-span-5">
          <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">Contract Review</h2>
            <p className="text-xs text-slate-400 mb-4">
              Reviews can be submitted once a lease agreement is marked as completed.
            </p>

            {contract.status === "completed" && isTenant ? (
              <form onSubmit={handleSubmitReview} className="flex flex-col gap-4">
                {reviewMsg && (
                  <div
                    className={`p-3 rounded text-xs ${
                      reviewMsg.isError
                        ? "bg-red-950/60 border border-red-800 text-red-300"
                        : "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                    }`}
                  >
                    {reviewMsg.text}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="review-rating"
                    className="block text-xs uppercase font-medium text-slate-400 mb-1"
                  >
                    Rating (1 to 5 Stars) *
                  </label>
                  <select
                    id="review-rating"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="5">★★★★★ (5 Stars - Exceptional)</option>
                    <option value="4">★★★★☆ (4 Stars - Very Good)</option>
                    <option value="3">★★★☆☆ (3 Stars - Average)</option>
                    <option value="2">★★☆☆☆ (2 Stars - Below Average)</option>
                    <option value="1">★☆☆☆☆ (1 Star - Poor)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="review-desc"
                    className="block text-xs uppercase font-medium text-slate-400 mb-1"
                  >
                    Review Feedback *
                  </label>
                  <textarea
                    id="review-desc"
                    rows={4}
                    required
                    minLength={10}
                    maxLength={500}
                    value={reviewDesc}
                    onChange={(e) => setReviewDesc(e.target.value)}
                    placeholder="Describe your tenancy experience, building amenities, landlord responsiveness..."
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-white text-slate-900 font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
                >
                  {submittingReview ? "Submitting Review..." : "Submit Verified Review"}
                </button>
              </form>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                {contract.status === "completed"
                  ? "Only the tenant can submit a review for this contract."
                  : `Review submission will unlock when contract status reaches 'completed' (currently '${contract.status}').`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
