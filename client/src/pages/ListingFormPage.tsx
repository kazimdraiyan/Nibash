import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DHAKA_AREAS } from "../utils/areaLookup";

export function ListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState(4); // Default to Gulshan (id 4)
  const [latitude, setLatitude] = useState(23.7917);
  const [longitude, setLongitude] = useState(90.4167);
  const [bedroomCount, setBedroomCount] = useState("3");
  const [bathroomCount, setBathroomCount] = useState("3");
  const [onWhichFloor, setOnWhichFloor] = useState("4");

  // Initial Terms State
  const [rent, setRent] = useState("65000");
  const [electricityBill, setElectricityBill] = useState("3500");
  const [waterBill, setWaterBill] = useState("1200");
  const [serviceCharge, setServiceCharge] = useState("5000");
  const [monthlyDueDate, setMonthlyDueDate] = useState("5");
  const [securityDeposit, setSecurityDeposit] = useState("130000");
  const [petAllowed, setPetAllowed] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  // Handle Area Change to automatically update lat/lng coordinates
  const handleAreaChange = (newAreaId: number) => {
    setAreaId(newAreaId);
    const matched = DHAKA_AREAS.find((a) => a.id === newAreaId);
    if (matched && matched.lat && matched.lng) {
      setLatitude(matched.lat);
      setLongitude(matched.lng);
    }
  };

  // If edit mode, load existing data
  useEffect(() => {
    if (!isEdit || !id) return;
    async function loadExistingListing() {
      try {
        const res = await apiClient.get<{ listing: any }>(`/listings/${id}`);
        const data = res.listing;
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAreaId(data.area_id || 4);
        setLatitude(parseFloat(data.latitude) || 23.7917);
        setLongitude(parseFloat(data.longitude) || 90.4167);
        setBedroomCount(String(data.bedroom_count || 1));
        setBathroomCount(String(data.bathroom_count || 1));
        setOnWhichFloor(String(data.on_which_floor || 1));
        setRent(String(data.rent || ""));
        setElectricityBill(String(data.electricity_bill || ""));
        setWaterBill(String(data.water_bill || ""));
        setServiceCharge(String(data.service_charge || ""));
        setMonthlyDueDate(String(data.monthly_due_date || "1"));
        setSecurityDeposit(String(data.security_deposit || ""));
        setPetAllowed(Boolean(data.pet_allowed));
      } catch (err: any) {
        setError(err.message || "Failed to fetch existing listing.");
      } finally {
        setInitialLoading(false);
      }
    }
    loadExistingListing();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      bedroom_count: parseInt(bedroomCount, 10),
      bathroom_count: parseInt(bathroomCount, 10),
      on_which_floor: parseInt(onWhichFloor, 10),
      area_id: Number(areaId),
      rent: parseFloat(rent),
      electricity_bill: parseFloat(electricityBill),
      water_bill: parseFloat(waterBill),
      service_charge: parseFloat(serviceCharge),
      monthly_due_date: parseInt(monthlyDueDate, 10),
      pet_allowed: petAllowed,
      security_deposit: parseFloat(securityDeposit),
    };

    try {
      if (isEdit) {
        await apiClient.patch(`/listings/${id}`, payload);
        navigate(`/listings/${id}`);
      } else {
        const res = await apiClient.post<{ message: string; listingId: number }>("/listings", payload);
        navigate(`/listings/${res.listingId}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save listing. Please verify inputs.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-3">Authentication Required</h1>
        <p className="text-slate-400 mb-6">
          Please log in to post or manage property listings.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: isEdit ? `/listings/${id}/edit` : "/listings/new" } }}
          className="inline-block bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading listing data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link to="/listings" className="text-xs text-slate-400 hover:text-white">
          ← Back to Listings
        </Link>
      </div>

      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          {isEdit ? "Edit Property Listing" : "Create New Apartment Listing"}
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Fill in the architectural specifications and monthly lease financial terms.
        </p>

        {error && (
          <div className="p-3 mb-6 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Basic Information */}
          <div>
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-1">
              1. Apartment Details
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="listing-title"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Listing Title *
                </label>
                <input
                  id="listing-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Imperial Apartment, Road 79"
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="listing-description"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Description *
                </label>
                <textarea
                  id="listing-description"
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the architectural highlights, view, ambient light, security, and fittings..."
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="listing-area"
                    className="block text-xs uppercase font-medium text-slate-300 mb-1"
                  >
                    Neighborhood / Area *
                  </label>
                  <select
                    id="listing-area"
                    value={areaId}
                    onChange={(e) => handleAreaChange(Number(e.target.value))}
                    className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                  >
                    {DHAKA_AREAS.map((area) => (
                      <option key={area.id} value={area.id} className="bg-[#12151c] text-white">
                        {area.name} (Area #{area.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="listing-lat"
                      className="block text-xs uppercase font-medium text-slate-300 mb-1"
                    >
                      Latitude
                    </label>
                    <input
                      id="listing-lat"
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value))}
                      className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="listing-lng"
                      className="block text-xs uppercase font-medium text-slate-300 mb-1"
                    >
                      Longitude
                    </label>
                    <input
                      id="listing-lng"
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value))}
                      className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="listing-beds"
                    className="block text-xs uppercase font-medium text-slate-300 mb-1"
                  >
                    Bedrooms *
                  </label>
                  <input
                    id="listing-beds"
                    type="number"
                    min="1"
                    required
                    value={bedroomCount}
                    onChange={(e) => setBedroomCount(e.target.value)}
                    className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="listing-baths"
                    className="block text-xs uppercase font-medium text-slate-300 mb-1"
                  >
                    Bathrooms *
                  </label>
                  <input
                    id="listing-baths"
                    type="number"
                    min="1"
                    required
                    value={bathroomCount}
                    onChange={(e) => setBathroomCount(e.target.value)}
                    className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="listing-floor"
                    className="block text-xs uppercase font-medium text-slate-300 mb-1"
                  >
                    Floor *
                  </label>
                  <input
                    id="listing-floor"
                    type="number"
                    min="0"
                    required
                    value={onWhichFloor}
                    onChange={(e) => setOnWhichFloor(e.target.value)}
                    className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Terms */}
          <div>
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-1">
              2. Initial Lease Terms
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="terms-rent"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Monthly Rent (BDT) *
                </label>
                <input
                  id="terms-rent"
                  type="number"
                  min="1000"
                  step="500"
                  required
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div>
                <label
                  htmlFor="terms-deposit"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Security Deposit (BDT) *
                </label>
                <input
                  id="terms-deposit"
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div>
                <label
                  htmlFor="terms-electricity"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Electricity Bill Est. (BDT) *
                </label>
                <input
                  id="terms-electricity"
                  type="number"
                  min="0"
                  required
                  value={electricityBill}
                  onChange={(e) => setElectricityBill(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div>
                <label
                  htmlFor="terms-water"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Water Bill (BDT) *
                </label>
                <input
                  id="terms-water"
                  type="number"
                  min="0"
                  required
                  value={waterBill}
                  onChange={(e) => setWaterBill(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div>
                <label
                  htmlFor="terms-service"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Service Charge (BDT) *
                </label>
                <input
                  id="terms-service"
                  type="number"
                  min="0"
                  required
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>

              <div>
                <label
                  htmlFor="terms-due-date"
                  className="block text-xs uppercase font-medium text-slate-300 mb-1"
                >
                  Monthly Due Date (Day 1 - 28) *
                </label>
                <input
                  id="terms-due-date"
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={monthlyDueDate}
                  onChange={(e) => setMonthlyDueDate(e.target.value)}
                  className="w-full bg-[#0d1017] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="pet-allowed"
                type="checkbox"
                checked={petAllowed}
                onChange={(e) => setPetAllowed(e.target.checked)}
                className="w-4 h-4 rounded text-black accent-[#d4b068] cursor-pointer"
              />
              <label htmlFor="pet-allowed" className="text-sm text-slate-300 cursor-pointer">
                Pets Allowed in this Apartment
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm shadow-md"
          >
            {loading ? "Saving Apartment..." : isEdit ? "Update Apartment" : "Publish Apartment Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
