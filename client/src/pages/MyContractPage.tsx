import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";

export function MyContractPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchActiveContract() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<{ contract: { contract_id: number } | null }>("/contracts/active");
        if (!isMounted) return;

        if (res.contract && res.contract.contract_id) {
          navigate(`/contracts/${res.contract.contract_id}`, { replace: true });
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to locate active contract.");
        setLoading(false);
      }
    }

    fetchActiveContract();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mb-4" />
        <h3 className="text-base font-semibold text-white mb-1">Locating Your Contract...</h3>
        <p className="text-xs text-slate-400">Fetching your ongoing tenancy agreement</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-8 sm:p-10 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-inner">
          <span className="material-symbols-outlined text-3xl">description</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">No Active Contract Found</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          {error
            ? error
            : "You currently do not have an active or signed lease agreement in the Nibash database. When an apartment application is approved and you sign your digital agreement, your ongoing contract will appear here."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/listings"
            className="w-full sm:w-auto bg-white text-slate-900 font-semibold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition"
          >
            Browse Apartments
          </Link>
          <Link
            to="/my-applications"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-medium px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition border border-slate-700"
          >
            My Applications
          </Link>
        </div>
      </div>
    </div>
  );
}
