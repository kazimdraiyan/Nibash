import type { StoredApplication } from "../utils/applicationStorage";
import type { BackendListing } from "../pages/ListingsPage";
import { Link } from "react-router-dom";

interface ApplicationInfoModalProps {
  application: StoredApplication | null;
  listing?: BackendListing | null;
  onClose: () => void;
}

export function ApplicationInfoModal({
  application,
  listing,
  onClose,
}: ApplicationInfoModalProps) {
  if (!application) return null;

  const listingId = application.listingId;
  const listingTitle = application.listingTitle || listing?.title || `Residence #${listingId}`;
  const appliedDate = application.appliedAt
    ? new Date(application.appliedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#12151c] border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Metallic / Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400">
              Application Status: {application.status === "approved" ? "Approved" : application.status === "rejected" ? "Rejected" : "Applied (Pending)"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Listing Summary */}
        <div className="mb-6 p-4 rounded-xl bg-[#090a0c] border border-slate-800">
          <div className="text-[11px] text-[#d4b068] font-mono uppercase mb-1">
            Residence #{listingId}
          </div>
          <h4 className="text-base font-semibold text-white line-clamp-1 mb-1">
            {listingTitle}
          </h4>
          <p className="text-xs text-slate-400">
            Applied on <span className="text-slate-200">{appliedDate}</span>
          </p>
        </div>

        {/* Submitted Information */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Submitted Applicant Details
          </div>

          {application.applicantName && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Applicant Name</span>
              <span className="font-medium text-white">{application.applicantName}</span>
            </div>
          )}

          {application.applicantEmail && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Email</span>
              <span className="font-medium text-white font-mono">{application.applicantEmail}</span>
            </div>
          )}

          {application.applicantPhone && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Phone</span>
              <span className="font-medium text-white font-mono">{application.applicantPhone}</span>
            </div>
          )}

          {application.monthlyIncome && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Monthly Income</span>
              <span className="font-medium text-white">৳{Number(application.monthlyIncome).toLocaleString()}</span>
            </div>
          )}

          {application.emergencyContact && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Emergency Contact</span>
              <span className="font-medium text-white font-mono">{application.emergencyContact}</span>
            </div>
          )}
        </div>

        {/* Informational Message */}
        <div className="p-3 mb-6 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2">
          <span className="material-symbols-outlined text-slate-400 text-base shrink-0 mt-0.5">
            info
          </span>
          <span>
            Your application is on record with the property owner. You cannot submit duplicate applications.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-4 rounded-xl transition text-xs cursor-pointer text-center"
          >
            Close
          </button>
          <Link
            to={`/listings/${listingId}`}
            onClick={onClose}
            className="flex-1 bg-white text-slate-900 font-semibold py-2.5 px-4 rounded-xl hover:bg-slate-200 transition text-xs cursor-pointer text-center"
          >
            View Listing →
          </Link>
        </div>
      </div>
    </div>
  );
}
