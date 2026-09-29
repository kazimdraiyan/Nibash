import { useState, useEffect, useRef } from "react";
import { apiClient } from "../api/client";

export interface ReviewMedia {
  id: number;
  url: string;
}

export interface ReviewData {
  id: number;
  contract_id: number;
  rating: number;
  description: string | null;
  created_at: string;
  media: ReviewMedia[];
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  listingTitle?: string;
  initialReview?: ReviewData | null;
  onReviewSaved: (review: ReviewData) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent",
};

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

export function ReviewModal({
  isOpen,
  onClose,
  contractId,
  listingTitle,
  initialReview,
  onReviewSaved,
}: ReviewModalProps) {
  const isEdit = Boolean(initialReview);

  const [rating, setRating] = useState<number>(initialReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [description, setDescription] = useState<string>(initialReview?.description || "");
  const [existingMedia, setExistingMedia] = useState<ReviewMedia[]>(initialReview?.media || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or initialReview changes
  useEffect(() => {
    if (isOpen) {
      setRating(initialReview?.rating || 0);
      setHoverRating(0);
      setDescription(initialReview?.description || "");
      setExistingMedia(initialReview?.media || []);
      setNewFiles([]);
      setNewPreviews([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialReview]);

  // Clean up object URLs on unmount / change
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  const totalImageCount = existingMedia.length + newFiles.length;

  const processFiles = (files: FileList | File[]) => {
    setError(null);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    const remainingSlots = MAX_IMAGES - totalImageCount;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} photos in total.`);
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);

    for (const file of filesArray) {
      if (!file.type.startsWith("image/")) {
        setError("Only JPG, PNG, and WebP images are supported.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setNewFiles((prev) => [...prev, ...validFiles]);
      setNewPreviews((prev) => [...prev, ...validPreviews]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeExistingMedia = (index: number) => {
    setExistingMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (isEdit && initialReview) {
        formData.append("rating", String(rating));
        formData.append("description", description.trim());

        const keepIds = existingMedia.map((m) => m.id);
        formData.append("keep_media_ids", JSON.stringify(keepIds));

        newFiles.forEach((file) => {
          formData.append("images", file);
        });

        const res = await apiClient.patchForm<{ message: string; review: ReviewData }>(
          `/reviews/${initialReview.id}`,
          formData
        );
        onReviewSaved(res.review);
      } else {
        formData.append("contract_id", String(contractId));
        formData.append("rating", String(rating));
        if (description.trim()) {
          formData.append("description", description.trim());
        }

        newFiles.forEach((file) => {
          formData.append("images", file);
        });

        const res = await apiClient.postForm<{ message: string; review: ReviewData }>(
          "/reviews",
          formData
        );
        onReviewSaved(res.review);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || rating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-[#12151c] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl relative overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0d1017]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#d4b068] text-xl">
                {isEdit ? "rate_review" : "hotel_class"}
              </span>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? "Edit Your Review" : "Write a Review"}
              </h2>
            </div>
            {listingTitle && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                Property: <span className="text-slate-200">{listingTitle}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* 1. Star Rating Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Overall Rating <span className="text-rose-400">*</span>
            </label>

            <div className="p-4 rounded-xl bg-[#090a0c] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      disabled={loading}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      className="text-3xl sm:text-4xl transition-transform hover:scale-115 cursor-pointer focus:outline-none"
                    >
                      <span
                        className={`material-symbols-outlined select-none ${
                          isFilled ? "text-amber-400 font-variation-fill" : "text-slate-700"
                        }`}
                        style={{
                          fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs sm:text-sm font-medium font-mono text-[#d4b068]">
                {currentDisplayRating > 0 ? (
                  <span>{RATING_LABELS[currentDisplayRating]}</span>
                ) : (
                  <span className="text-slate-500 italic">Select 1 to 5 stars</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Review Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="review-desc" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detailed Review <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  description.length >= 950 ? "text-amber-400 font-bold" : "text-slate-500"
                }`}
              >
                {description.length} / 1000
              </span>
            </div>

            <textarea
              id="review-desc"
              rows={4}
              maxLength={1000}
              disabled={loading}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your experience with the apartment, amenities, landlord communication, and neighborhood..."
              className="w-full bg-[#090a0c] border border-slate-800 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d4b068] transition resize-none disabled:opacity-50"
            />
          </div>

          {/* 3. Image Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Photos <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {totalImageCount} / {MAX_IMAGES} photos
              </span>
            </div>

            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={loading || totalImageCount >= MAX_IMAGES}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Drag & Drop Area */}
            {totalImageCount < MAX_IMAGES && (
              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                  dragOver
                    ? "border-[#d4b068] bg-[#d4b068]/5"
                    : "border-slate-800 hover:border-slate-600 bg-[#090a0c]/60 hover:bg-[#090a0c]"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 mb-1">
                  <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                </div>
                <p className="text-xs font-medium text-slate-300">
                  {dragOver ? "Drop image files here" : "Click to browse or drag and drop photos"}
                </p>
                <p className="text-[11px] text-slate-500">
                  JPG, PNG, or WebP &bull; Up to 5MB each &bull; Max {MAX_IMAGES} photos
                </p>
              </div>
            )}

            {/* Image Preview Grid */}
            {totalImageCount > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                {/* Existing media */}
                {existingMedia.map((m, idx) => (
                  <div
                    key={`existing-${m.id}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 bg-black group shadow-sm"
                  >
                    <img src={m.url} alt={`Saved review photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => removeExistingMedia(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                      title="Remove saved photo"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/80 text-[9px] font-mono text-slate-300 px-1 rounded">
                      Saved
                    </span>
                  </div>
                ))}

                {/* Newly selected files */}
                {newFiles.map((file, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-emerald-700/60 bg-black group shadow-sm"
                  >
                    <img src={newPreviews[idx]} alt={`New review preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                      title="Remove photo"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1 text-[9px] font-mono text-emerald-300 truncate">
                      {(file.size / (1024 * 1024)).toFixed(1)}MB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || rating === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              )}
              <span>
                {loading
                  ? isEdit
                    ? "Updating Review..."
                    : "Submitting..."
                  : isEdit
                  ? "Update Review"
                  : "Submit Review"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
