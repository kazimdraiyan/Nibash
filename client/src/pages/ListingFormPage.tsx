import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DHAKA_AREAS } from "../utils/areaLookup";
import { uploadListingImages } from "../api/uploadImages";
import { LocationPicker } from "../components/LocationPicker";
import { uploadListingDocuments } from "../api/uploadDocuments";

const DOCUMENT_TYPES = [
  {
    id: "electricity_bill_receipt",
    label: "Electricity Bill Receipt",
    shortLabel: "Electricity Bill",
    icon: "⚡",
    hint: "Recent DPDC, DESCO, or NESCO bill receipt",
  },
  {
    id: "holding_tax_receipt",
    label: "Holding Tax Receipt",
    shortLabel: "Holding Tax",
    icon: "🏛",
    hint: "City Corporation holding tax payment challan",
  },
  {
    id: "water_bill_receipt",
    label: "Water Bill (WASA)",
    shortLabel: "Water Bill",
    icon: "💧",
    hint: "Recent DWASA bill receipt or bank stamp",
  },
  {
    id: "trade_license",
    label: "Trade License",
    shortLabel: "Trade License",
    icon: "📋",
    hint: "Valid business or municipal trade license copy",
  },
  {
    id: "nid",
    label: "National ID (NID)",
    shortLabel: "NID Card",
    icon: "🪪",
    hint: "Clear photo or scan of front and back of NID",
  },
  {
    id: "passport",
    label: "Passport",
    shortLabel: "Passport",
    icon: "🛂",
    hint: "Information page and validity stamp",
  },
  {
    id: "driving_license",
    label: "Driving License",
    shortLabel: "Driving License",
    icon: "🚗",
    hint: "BRTA smart driving license front and back",
  },
] as const;

interface StagedDocument {
  id: string;
  type: string;
  file: File;
  previewUrl: string;
}

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
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: number; url: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>(
    "electricity_bill_receipt",
  );
  const [stagedDocs, setStagedDocs] = useState<StagedDocument[]>([]);
  const [isDocDragging, setIsDocDragging] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize preview URLs with images single source of truth
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Clean up object URLs for staged documents on unmount
  useEffect(() => {
    return () => {
      stagedDocs.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    };
  }, []);

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

  function handleImageFiles(incoming: FileList | File[] | null) {
    if (!incoming) return;
    const fileArray = Array.from(incoming);
    const validFiles = fileArray.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(
        file.type,
      ),
    );

    if (validFiles.length === 0) return;

    setImages((prev) => {
      const remainingSlots = 10 - prev.length;
      if (remainingSlots <= 0) return prev;
      return [...prev, ...validFiles.slice(0, remainingSlots)];
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    handleImageFiles(e.target.files);
    if (e.target) e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDocFiles(
    incoming: FileList | File[] | null,
    targetDocType: string,
  ) {
    if (!incoming) return;
    const fileArray = Array.from(incoming);
    const validFiles = fileArray.filter(
      (file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
          "application/pdf",
        ].includes(file.type) && file.size <= 5 * 1024 * 1024,
    );

    if (validFiles.length === 0) return;

    // Check count for targetDocType (max 5 per type)
    const existingCount = stagedDocs.filter((d) => d.type === targetDocType).length;
    const remainingSlots = 5 - existingCount;
    if (remainingSlots <= 0) return;

    const filesToAdd = validFiles.slice(0, remainingSlots);
    const newItems: StagedDocument[] = filesToAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: targetDocType,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setStagedDocs((prev) => [...prev, ...newItems]);
  }

  function handleDocSelect(e: React.ChangeEvent<HTMLInputElement>) {
    handleDocFiles(e.target.files, selectedDocType);
    if (e.target) e.target.value = "";
  }

  function handleDocDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragging(true);
  }

  function handleDocDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragging(false);
  }

  function handleDocDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocFiles(e.dataTransfer.files, selectedDocType);
    }
  }

  function removeStagedDoc(docId: string) {
    setStagedDocs((prev) => {
      const item = prev.find((d) => d.id === docId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((d) => d.id !== docId);
    });
  }

  function clearAllDocs() {
    stagedDocs.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setStagedDocs([]);
  }

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
        if (Array.isArray(data.images) && data.images.length > 0) {
          setExistingImages(data.images);
        }
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
      let targetId: string;

      if (isEdit) {
        await apiClient.patch(`/listings/${id}`, payload);
        targetId = id!;
      } else {
        const res = await apiClient.post<{
          message: string;
          listingId: number;
        }>("/listings", payload);
        targetId = String(res.listingId);
      }

      if (images.length > 0) {
        setUploading(true);
        try {
          await uploadListingImages(targetId, images);
        } catch (err: any) {
          // show image upload error separately
          setError(`Image upload failed: ${err.message || "unknown error"}`);
          setUploading(false);
          setLoading(false);
          return;
        }
        setUploading(false);
      }

      if (!isEdit && stagedDocs.length > 0) {
        setDocUploading(true);
        try {
          const grouped = stagedDocs.reduce<Record<string, File[]>>(
            (acc, item) => {
              if (!acc[item.type]) acc[item.type] = [];
              acc[item.type].push(item.file);
              return acc;
            },
            {},
          );

          for (const [type, files] of Object.entries(grouped)) {
            await uploadListingDocuments(targetId, type, files);
          }
        } catch (err: any) {
          setError(`Document upload failed: ${err.message || "unknown error"}`);
          setDocUploading(false);
          setLoading(false);
          return;
        }
        setDocUploading(false);
      }

      navigate(`/listings/${targetId}`);
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
          state={{
            from: {
              pathname: isEdit ? `/listings/${id}/edit` : "/listings/new",
            },
          }}
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
        <Link
          to="/listings"
          className="text-xs text-slate-400 hover:text-white"
        >
          ← Back to Listings
        </Link>
      </div>

      <div className="border border-slate-800 bg-[#12151c] rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          {isEdit ? "Edit Property Listing" : "Create New Apartment Listing"}
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          Fill in the architectural specifications and monthly lease financial
          terms.
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
                    <option
                      key={area.id}
                      value={area.id}
                      className="bg-[#12151c] text-white"
                    >
                      {area.name} (Area #{area.id})
                    </option>
                  ))}
                </select>

                <div className="sm:col-span-2 mt-6">
                  <label className="block text-xs uppercase font-medium text-slate-300 mb-1">
                    Location *
                  </label>
                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                  />
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
              <label
                htmlFor="pet-allowed"
                className="text-sm text-slate-300 cursor-pointer"
              >
                Pets Allowed in this Apartment
              </label>
            </div>
          </div>

          {/* Section 3: Property Photos */}
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1">
              <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400">
                3. Property Media & Photos
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {images.length} / 10 selected
              </span>
            </div>

            {/* Currently Uploaded Photos (Edit Mode) */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Currently Uploaded Photos ({existingImages.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="aspect-[4/3] rounded-xl overflow-hidden relative border border-slate-800 bg-[#0d1017] group"
                    >
                      <img
                        src={img.url}
                        alt={`Listing image ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-slate-300 border border-white/10 text-[10px] font-mono px-2 py-0.5 rounded-md">
                        {idx === 0 ? "Cover Photo" : `Photo ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-amber-400/80 bg-amber-500/5 scale-[0.99]"
                  : "border-slate-700/80 bg-[#0d1017] hover:border-slate-500 hover:bg-[#10141d]"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-slate-300 transition-transform group-hover:scale-110">
                <svg
                  className="w-6 h-6 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <p className="text-sm font-medium text-white mb-1">
                {isDragging
                  ? "Drop images here to add"
                  : "Click to browse or drag and drop photos"}
              </p>
              <p className="text-xs text-slate-400 mb-3">
                JPG, PNG, or WebP &bull; Maximum 10 photos
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Select Photos
              </span>
            </div>

            {/* Selected Previews Grid */}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                    New Photos to Upload ({previewUrls.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setImages([])}
                    className="text-[11px] text-slate-400 hover:text-red-400 transition cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {previewUrls.map((url, i) => {
                    const file = images[i];
                    const isCover = i === 0 && existingImages.length === 0;
                    return (
                      <div
                        key={url}
                        className="aspect-[4/3] rounded-xl overflow-hidden relative border border-slate-700/70 bg-[#0d1017] group shadow-sm"
                      >
                        <img
                          src={url}
                          alt={
                            file?.name
                              ? `Preview ${file.name}`
                              : `Preview ${i + 1}`
                          }
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Top Gradient for badge readability */}
                        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                        {/* Cover Photo Badge */}
                        {isCover && (
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-amber-300 border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <span>★</span>
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(i);
                          }}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-red-600 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10 shadow cursor-pointer"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>

                        {/* Bottom file metadata */}
                        {file && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-[10px] text-slate-300 flex items-center justify-between pointer-events-none font-mono">
                            <span className="truncate max-w-[70%]">
                              {file.name}
                            </span>
                            <span className="text-slate-400 ml-1 shrink-0">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add more tile if under max limit */}
                  {images.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/3] rounded-xl border border-dashed border-slate-700/80 hover:border-slate-400 bg-[#0d1017]/50 hover:bg-[#0d1017] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition cursor-pointer p-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium">Add more</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {10 - images.length} left
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] text-slate-400 leading-relaxed flex items-center gap-1.5">
              <span className="text-amber-400">💡</span>
              <span>
                Tip: Clean, well-lit photos of the interior and view make your
                listing stand out to prospective tenants.
              </span>
            </p>
          </div>

          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    4. Verification Documents
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Optional
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {stagedDocs.length}{" "}
                  {stagedDocs.length === 1 ? "document" : "documents"} staged
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Attach proof documents (utility receipts, holding tax, trade
                license, NID) for the verification team. Verified listings gain
                trust and rank higher.
              </p>

              {/* Quick Type Selection Pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DOCUMENT_TYPES.map((dt) => {
                  const count = stagedDocs.filter(
                    (d) => d.type === dt.id,
                  ).length;
                  const isSelected = selectedDocType === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setSelectedDocType(dt.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-slate-700/80 border-slate-500 text-white shadow-sm font-medium"
                          : "bg-[#0d1017] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span>{dt.icon}</span>
                      <span>{dt.shortLabel}</span>
                      {count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Document Category Bar */}
              {(() => {
                const currentTypeInfo =
                  DOCUMENT_TYPES.find((d) => d.id === selectedDocType) ||
                  DOCUMENT_TYPES[0];
                const countForCurrentType = stagedDocs.filter(
                  (d) => d.type === selectedDocType,
                ).length;
                return (
                  <div className="bg-[#0d1017] border border-slate-800 rounded-xl p-3.5 mb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{currentTypeInfo.icon}</span>
                        <span className="text-xs font-semibold text-white">
                          {currentTypeInfo.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {countForCurrentType} / 5 photos added
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="text-amber-400">💡</span>
                      <span>{currentTypeInfo.hint}</span>
                    </p>
                  </div>
                );
              })()}

              {/* Hidden Document File Input */}
              <input
                ref={docFileInputRef}
                id="doc-files"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={handleDocSelect}
                className="hidden"
              />

              {/* Drag & Drop Area */}
              <div
                onClick={() => docFileInputRef.current?.click()}
                onDragOver={handleDocDragOver}
                onDragLeave={handleDocDragLeave}
                onDrop={handleDocDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDocDragging
                    ? "border-amber-400/80 bg-amber-500/5 scale-[0.99]"
                    : "border-slate-700/80 bg-[#0d1017] hover:border-slate-500 hover:bg-[#10141d]"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2.5 text-slate-300 transition-transform group-hover:scale-110">
                  <svg
                    className="w-5 h-5 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                <p className="text-sm font-medium text-white mb-0.5">
                  {isDocDragging
                    ? "Drop document files here"
                    : `Click to browse or drop ${
                        DOCUMENT_TYPES.find((d) => d.id === selectedDocType)
                          ?.shortLabel || "document"
                      } files (PDF or Images)`}
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  PDF, JPG, PNG, or WebP &bull; Up to 5MB per file &bull; Max 5 files
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Select Document Files
                </span>
              </div>

              {/* Staged Documents Previews Grouped by Type */}
              {stagedDocs.length > 0 && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                      Staged Verification Documents ({stagedDocs.length})
                    </span>
                    <button
                      type="button"
                      onClick={clearAllDocs}
                      className="text-[11px] text-slate-400 hover:text-red-400 transition cursor-pointer"
                    >
                      Clear all documents
                    </button>
                  </div>

                  {DOCUMENT_TYPES.map((dt) => {
                    const docsForType = stagedDocs.filter(
                      (d) => d.type === dt.id,
                    );
                    if (docsForType.length === 0) return null;

                    return (
                      <div
                        key={dt.id}
                        className="bg-[#0d1017] border border-slate-800 rounded-xl p-3 sm:p-4"
                      >
                        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{dt.icon}</span>
                            <span className="text-xs font-semibold text-white">
                              {dt.label}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {docsForType.length}{" "}
                              {docsForType.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              docsForType.forEach((d) => removeStagedDoc(d.id));
                            }}
                            className="text-[11px] text-slate-500 hover:text-red-400 transition cursor-pointer"
                          >
                            Remove category
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {docsForType.map((doc, idx) => {
                            const isPdf =
                              doc.file.type === "application/pdf" ||
                              doc.file.name.toLowerCase().endsWith(".pdf");

                            return (
                              <div
                                key={doc.id}
                                onClick={
                                  isPdf
                                    ? () => window.open(doc.previewUrl, "_blank")
                                    : undefined
                                }
                                title={
                                  isPdf
                                    ? "Click to open and preview PDF"
                                    : undefined
                                }
                                className={`aspect-[4/3] rounded-xl overflow-hidden relative border border-slate-700/70 bg-[#12151c] group shadow-sm flex flex-col justify-between ${
                                  isPdf
                                    ? "cursor-pointer hover:border-slate-500 transition-colors"
                                    : ""
                                }`}
                              >
                                {isPdf ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-red-950/20 via-[#0d1017] to-[#12151c] transition-colors group-hover:bg-red-950/30">
                                    <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-500/30 flex items-center justify-center text-red-400 transition-transform group-hover:scale-110 shadow-sm mb-1">
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 13h6m-6 4h4"
                                        />
                                      </svg>
                                    </div>
                                    <span className="text-[10px] font-mono font-semibold text-red-400 uppercase tracking-wider">
                                      PDF
                                    </span>
                                  </div>
                                ) : (
                                  <img
                                    src={doc.previewUrl}
                                    alt={`${dt.shortLabel} ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                )}

                                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-slate-300 border border-white/10 text-[10px] font-mono px-2 py-0.5 rounded-md">
                                  {dt.shortLabel} #{idx + 1}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStagedDoc(doc.id);
                                  }}
                                  aria-label={`Remove ${dt.shortLabel} document ${idx + 1}`}
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-red-600 text-slate-200 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors border border-white/10 shadow cursor-pointer z-10"
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-[10px] text-slate-300 flex items-center justify-between pointer-events-none font-mono">
                                  <span className="truncate max-w-[70%]">
                                    {doc.file.name}
                                  </span>
                                  <span className="text-slate-400 ml-1 shrink-0">
                                    {(doc.file.size / (1024 * 1024)).toFixed(1)}{" "}
                                    MB
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {docsForType.length < 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocType(dt.id);
                                docFileInputRef.current?.click();
                              }}
                              className="aspect-[4/3] rounded-xl border border-dashed border-slate-700/80 hover:border-slate-400 bg-[#12151c]/50 hover:bg-[#12151c] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition cursor-pointer p-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                              </div>
                              <span className="text-xs font-medium">
                                Add more
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {5 - docsForType.length} left
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploading || docUploading}
            className="mt-2 w-full bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer text-sm shadow-md flex items-center justify-center gap-2"
          >
            {(loading || uploading || docUploading) && (
              <svg
                className="animate-spin h-4 w-4 text-slate-900"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {uploading
              ? "Uploading Photos..."
              : docUploading
                ? "Uploading Verification Documents..."
                : loading
                  ? isEdit
                    ? "Updating Apartment..."
                    : "Saving Apartment..."
                  : isEdit
                    ? "Update Apartment"
                    : "Publish Apartment Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
