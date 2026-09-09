import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface UnverifiedListing {
  id: number;
  title: string;
  description: string;
  bedroom_count: number;
  bathroom_count: number;
  on_which_floor: number;
  rent: number;
  images?: { id: number; url: string }[];
}

export function VerifyPortalPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<UnverifiedListing[]>([]);
  const [selected, setSelected] = useState<UnverifiedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function loadListings() {
    setLoading(true);
    try {
      const res = await apiClient.get<{ listings: UnverifiedListing[] }>(
        "/verify/listings",
      );
      setListings(res.listings);
    } catch (err: any) {
      setError(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, []);

  async function handleVerify(id: number) {
    setVerifying(true);
    try {
      await apiClient.post(`/verify/listings/${id}/verify`);
      setSelected(null);
      await loadListings();
    } catch (err: any) {
      setError(err.message || "Failed to verify listing");
    } finally {
      setVerifying(false);
    }
  }

  if (!token)
    return (
      <div className="py-16 text-center text-slate-400">
        Please log in as a verifier.
      </div>
    );
  if (loading)
    return (
      <div className="py-16 text-center text-slate-400">
        Loading unverified listings...
      </div>
    );

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-slate-400"
          >
            {"< Back to list"}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-white"
          >
            Log out
          </button>
        </div>
        <div className="max-w-3xl mx-auto py-10 px-4">
          <h1 className="text-2xl font-bold mb-2">{selected.title}</h1>
          <p className="text-slate-400 mb-4">{selected.description}</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(selected.images ?? []).map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt=""
                className="w-full h-32 object-cover rounded-lg"
              />
            ))}
          </div>
          <p className="mb-2">
            Bedrooms: {selected.bedroom_count} · Bathrooms:{" "}
            {selected.bathroom_count} · Floor: {selected.on_which_floor}
          </p>
          <p className="mb-6">Rent: ৳{selected.rent}</p>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <button
            onClick={() => handleVerify(selected.id)}
            disabled={verifying}
            className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            {verifying ? "Verifying..." : "Mark as Verified"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Unverified Listings</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          Log out
        </button>
      </div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {listings.length === 0 && (
        <p className="text-slate-400">No listings pending verification.</p>
      )}
      <div className="space-y-3">
        {listings.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l)}
            className="block w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-4 transition"
          >
            <p className="font-medium">{l.title}</p>
            <p className="text-sm text-slate-400">
              ৳{l.rent} · {l.bedroom_count} bed
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
