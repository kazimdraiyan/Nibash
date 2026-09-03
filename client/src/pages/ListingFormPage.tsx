import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient, makeOwner } from "../api/client";
import { useAuth } from "../context/AuthContext";

const DHAKA_AREAS = [
  { id: 1, name: "Azimpur", lat: 23.7298, lng: 90.3854 },
  { id: 2, name: "Dhanmondi", lat: 23.7450, lng: 90.3767 },
  { id: 3, name: "Mohammadpur", lat: 23.7664, lng: 90.3586 },
  { id: 4, name: "Gulshan", lat: 23.7917, lng: 90.4167 },
  { id: 5, name: "Banani", lat: 23.7950, lng: 90.4047 },
  { id: 6, name: "Mirpur", lat: 23.8046, lng: 90.3631 },
  { id: 7, name: "Khilkhet", lat: 23.8311, lng: 90.4243 },
  { id: 8, name: "Uttara", lat: 23.8770, lng: 90.3770 },
  { id: 9, name: "Bashundhara", lat: 23.8167, lng: 90.4326 },
  { id: 10, name: "Tejgaon", lat: 23.7640, lng: 90.3917 },
  { id: 11, name: "Lalbagh", lat: 23.7198, lng: 90.3897 },
  { id: 12, name: "Badda", lat: 23.7716, lng: 90.4274 },
];

export function ListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token, user } = useAuth();

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
  const [warning, setWarning] = useState<string | null>(null);

  // Handle Area Change to automatically update lat/lng coordinates
  const handleAreaChange = (newAreaId: number) => {
    setAreaId(newAreaId);
    const matched = DHAKA_AREAS.find((a) => a.id === newAreaId);
    if (matched) {
      setLatitude(matched.lat);
      setLongitude(matched.lng);
    }
  };

  // If edit mode, fetch existing listing details
  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchExisting = async () => {
      try {
        const res = await apiClient.get<{ listing: any }>(`/listings/${id}`);
        const data = res.listing;
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAreaId(data.area_id || 4);
        setLatitude(data.latitude || 23.7917);
        setLongitude(data.longitude || 90.4167);
        setBedroomCount(String(data.bedroom_count || 3));
        setBathroomCount(String(data.bathroom_count || 3));
        setOnWhichFloor(String(data.on_which_floor || 1));
      } catch (err: any) {
        setError(err.message || "Failed to load listing for editing.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchExisting();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please log in to submit listings.");
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    // Resolve user details safely from auth state or token payload
    let authenticatedUserId = user?.id;
    let authenticatedUserEmail = user?.email;
    let authenticatedUserName = user?.name;
    if (!authenticatedUserId && token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        authenticatedUserId = payload.id;
        authenticatedUserEmail = payload.email;
      } catch {
        // ignore decoding errors
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      area_id: Number(areaId),
      latitude: Number(latitude),
      longitude: Number(longitude),
      bedroom_count: Number(bedroomCount),
      bathroom_count: Number(bathroomCount),
      on_which_floor: Number(onWhichFloor),
      rent: Number(rent),
      electricity_bill: Number(electricityBill),
      water_bill: Number(waterBill),
      service_charge: Number(serviceCharge),
      monthly_due_date: Number(monthlyDueDate),
      security_deposit: Number(securityDeposit),
      pet_allowed: Boolean(petAllowed),
    };

    if (isEdit) {
      try {
        await apiClient.patch(`/listings/${id}`, payload);
        alert("Listing updated successfully!");
        navigate(`/listings/${id}`);
      } catch (err: any) {
        setError(err.message || "Failed to update listing.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // 1. Create listing using existing API
    let createRes: { message: string; listingId: number };
    try {
      createRes = await apiClient.post<{ message: string; listingId: number }>(
        "/listings",
        payload
      );
      console.log(
        "[Listing Creation] Listing creation request succeeded. Listing ID:",
        createRes.listingId,
        createRes
      );
    } catch (createErr: any) {
      console.error("[Listing Creation] Listing creation failed:", createErr);
      setError(createErr.message || "Failed to create listing.");
      setLoading(false);
      return;
    }

    // 2. Listing creation succeeded. Now call makeOwner route (/auth/become-owner)
    try {
      console.log(
        "[Owner Registration] Sending makeOwner request for authenticated user:",
        {
          id: authenticatedUserId,
          name: authenticatedUserName,
          email: authenticatedUserEmail,
        }
      );
      const ownerRes = await makeOwner(authenticatedUserId);
      console.log("[Owner Registration] makeOwner request succeeded:", ownerRes);

      alert(createRes.message || "Listing created successfully!");
      navigate("/listings");
    } catch (ownerErr: any) {
      console.error(
        "[Owner Registration] makeOwner request failed:",
        ownerErr
      );
      const warningMsg = `Listing was created successfully (ID: ${createRes.listingId}), but owner registration failed: ${ownerErr.message || "Unknown error"}.`;
      setWarning(warningMsg);
      alert(`Warning: ${warningMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          You must be logged in to create or edit property listings.
        </p>
        <Link to="/login" className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-medium">
          Log In
        </Link>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading listing details...</p>
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
          {isEdit ? "Edit Property Listing" : "Create New Residence Listing"}
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Fill in the architectural specifications and monthly lease financial terms.
        </p>

        {error && (
          <div className="p-3 mb-6 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
            {error}
          </div>
        )}

        {warning && (
          <div className="p-3 mb-6 rounded bg-amber-950/60 border border-amber-800 text-amber-300 text-xs">
            {warning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Basic Information */}
          <div>
            <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-1">
              1. Residence Details
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
                  placeholder="e.g. The Imperial Residence, Road 79"
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-black"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-black"
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
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-black"
                  >
                    {DHAKA_AREAS.map((area) => (
                      <option key={area.id} value={area.id}>
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
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
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
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="pet-allowed"
                type="checkbox"
                checked={petAllowed}
                onChange={(e) => setPetAllowed(e.target.checked)}
                className="w-4 h-4 rounded text-black accent-black cursor-pointer"
              />
              <label htmlFor="pet-allowed" className="text-sm text-slate-300 cursor-pointer">
                Pets Allowed in this Residence
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? "Saving Residence..." : isEdit ? "Update Residence" : "Publish Residence Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
