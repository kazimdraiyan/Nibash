import { useState, useEffect, useCallback } from "react";

export interface DocumentMediaItem {
  id: number;
  url: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentType: string;
  isVerified?: boolean;
  uploadedAt?: string;
  media: DocumentMediaItem[];
  initialIndex?: number;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  documentTitle,
  documentType,
  isVerified = false,
  uploadedAt,
  media = [],
  initialIndex = 0,
}: DocumentViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex, isOpen]);

  const currentMedia = media[currentIndex] || null;
  const currentUrl = currentMedia?.url || "";

  const isPdf = Boolean(
    currentUrl.toLowerCase().includes(".pdf") ||
      currentUrl.toLowerCase().endsWith(".pdf")
  );

  const handlePrev = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    setZoom(1);
  }, [media.length]);

  const handleNext = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    setZoom(1);
  }, [media.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isFullscreen, handlePrev, handleNext]);

  if (!isOpen || !currentMedia) return null;

  const formattedDate = uploadedAt
    ? new Date(uploadedAt).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn transition-all ${
        isFullscreen ? "p-0" : "p-2 sm:p-4"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-[#12151c] border border-white/15 flex flex-col shadow-2xl overflow-hidden text-left transition-all ${
          isFullscreen
            ? "w-screen h-screen rounded-none border-none"
            : "w-full max-w-[96vw] xl:max-w-[1440px] h-[94vh] rounded-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header — Compact & Minimal Vertical Footprint */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#0d1017] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <span className="material-symbols-outlined text-lg">
                {isPdf ? "description" : "image"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
                  {documentTitle}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase font-label-sm tracking-wider font-semibold border ${
                    isVerified
                      ? "text-emerald-300 bg-emerald-950/70 border-emerald-500/40"
                      : "text-amber-300 bg-amber-950/70 border-amber-500/40"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isVerified ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  {isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-0.5">
                <span className="font-mono text-[10px] text-slate-400">
                  {documentType}
                </span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="hidden md:inline">Uploaded {formattedDate}</span>
                  </>
                )}
                {media.length > 1 && (
                  <>
                    <span>•</span>
                    <span className="text-[#d4b068] font-medium font-mono text-[10px]">
                      File {currentIndex + 1} of {media.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1.5">
            {!isPdf && (
              <div className="hidden sm:flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5 mr-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="text-[10px] font-mono px-1.5 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
                  title="Reset Zoom"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                </button>
              </div>
            )}

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              <span className="material-symbols-outlined text-sm">
                {isFullscreen ? "fullscreen_exit" : "fullscreen"}
              </span>
              <span className="hidden md:inline text-[11px]">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </span>
            </button>

            {/* Open in Tab */}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Open raw file in new tab"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span className="hidden md:inline text-[11px]">Raw File</span>
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content — Maximized Viewport with Zero Padding Choke */}
        <div className="flex-1 relative overflow-hidden bg-[#07080a] flex items-center justify-center p-1 sm:p-2">
          {/* Navigation Prev/Next controls when multi-file */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 transition shadow-xl cursor-pointer"
                aria-label="Previous file"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 transition shadow-xl cursor-pointer"
                aria-label="Next file"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </>
          )}

          {isPdf ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={`${currentUrl}#toolbar=1`}
                title={documentTitle}
                className="w-full h-full rounded-lg border border-white/10 bg-white"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-1">
              <img
                src={currentUrl}
                alt={documentTitle}
                style={{
                  transform: `scale(${zoom})`,
                  transition: "transform 0.2s ease-out",
                  transformOrigin: "center center",
                }}
                className="max-h-full max-w-full w-auto h-auto object-contain rounded shadow-2xl"
              />
            </div>
          )}
        </div>

        {/* Modal Footer / Thumbnails Navigation — Compact Strip */}
        {media.length > 1 && (
          <div className="px-4 py-2 border-t border-white/10 bg-[#0d1017] flex items-center justify-center gap-2 overflow-x-auto shrink-0">
            {media.map((item, idx) => {
              const itemIsPdf = item.url.toLowerCase().includes(".pdf");
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                  }}
                  className={`w-14 h-10 rounded-lg border overflow-hidden flex items-center justify-center transition flex-shrink-0 relative cursor-pointer ${
                    currentIndex === idx
                      ? "border-[#d4b068] ring-2 ring-[#d4b068]/30 scale-105"
                      : "border-white/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  {itemIsPdf ? (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-sm text-red-400">
                        picture_as_pdf
                      </span>
                      <span className="text-[8px] uppercase font-mono">PDF {idx + 1}</span>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
