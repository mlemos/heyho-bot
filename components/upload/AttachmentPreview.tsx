"use client";

import type { AttachedFile } from "./FileDropZone";

// ===========================================
// Types
// ===========================================

interface AttachmentPreviewProps {
  file: AttachedFile;
  onRemove?: (id: string) => void;
  size?: "sm" | "md" | "lg";
}

// ===========================================
// Utilities
// ===========================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): { icon: string; color: string } {
  // Images
  if (mimeType.startsWith("image/")) {
    return { icon: "🖼️", color: "bg-purple-500/20 text-purple-400" };
  }

  // PDFs
  if (mimeType === "application/pdf") {
    return { icon: "📄", color: "bg-red-500/20 text-red-400" };
  }

  // Office documents
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "application/msword"
  ) {
    return { icon: "📝", color: "bg-blue-500/20 text-blue-400" };
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return { icon: "📊", color: "bg-green-500/20 text-green-400" };
  }

  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint") ||
    mimeType === "application/vnd.ms-powerpoint"
  ) {
    return { icon: "📽️", color: "bg-orange-500/20 text-orange-400" };
  }

  // Audio
  if (mimeType.startsWith("audio/")) {
    return { icon: "🎵", color: "bg-pink-500/20 text-pink-400" };
  }

  // Video
  if (mimeType.startsWith("video/")) {
    return { icon: "🎬", color: "bg-cyan-500/20 text-cyan-400" };
  }

  // Code/text
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    return { icon: "📃", color: "bg-zinc-500/20 text-zinc-400" };
  }

  // Data files
  if (mimeType === "text/csv") {
    return { icon: "📈", color: "bg-green-500/20 text-green-400" };
  }

  // Default
  return { icon: "📎", color: "bg-zinc-500/20 text-zinc-400" };
}

function truncateFilename(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;

  const ext = name.split(".").pop() || "";
  const nameWithoutExt = name.slice(0, name.length - ext.length - 1);

  const availableLength = maxLength - ext.length - 4; // 4 for "..." and "."
  if (availableLength < 4) return `...${name.slice(-maxLength + 3)}`;

  return `${nameWithoutExt.slice(0, availableLength)}...${ext ? `.${ext}` : ""}`;
}

// ===========================================
// Component
// ===========================================

export function AttachmentPreview({
  file,
  onRemove,
  size = "md",
}: AttachmentPreviewProps) {
  const { icon, color } = getFileIcon(file.file.type);

  const sizeClasses = {
    sm: {
      container: "w-16 h-16",
      icon: "text-lg",
      preview: "w-16 h-16",
      button: "w-4 h-4 -top-1 -right-1",
      buttonIcon: "w-2 h-2",
    },
    md: {
      container: "w-20 h-20",
      icon: "text-2xl",
      preview: "w-20 h-20",
      button: "w-5 h-5 -top-1.5 -right-1.5",
      buttonIcon: "w-3 h-3",
    },
    lg: {
      container: "w-24 h-24",
      icon: "text-3xl",
      preview: "w-24 h-24",
      button: "w-6 h-6 -top-2 -right-2",
      buttonIcon: "w-3 h-3",
    },
  };

  const s = sizeClasses[size];

  return (
    <div className="relative group">
      {/* Preview container */}
      <div
        className={`
          ${s.container} rounded-lg overflow-hidden
          border border-zinc-700 bg-zinc-800
          flex items-center justify-center
        `}
      >
        {file.preview ? (
          // Image preview
          <img
            src={file.preview}
            alt={file.file.name}
            className={`${s.preview} object-cover`}
          />
        ) : (
          // Icon preview
          <div
            className={`
              ${s.container} flex items-center justify-center
              ${color}
            `}
          >
            <span className={s.icon}>{icon}</span>
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={() => onRemove(file.id)}
          className={`
            absolute ${s.button}
            bg-red-500 hover:bg-red-600
            rounded-full flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            shadow-lg
          `}
          title="Remove file"
        >
          <svg
            className={`${s.buttonIcon} text-white`}
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
      )}

      {/* File info tooltip */}
      <div
        className="
          absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full
          bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          pointer-events-none z-10
          whitespace-nowrap
        "
      >
        <p className="text-xs text-zinc-300">{truncateFilename(file.file.name)}</p>
        <p className="text-xs text-zinc-500">{formatFileSize(file.file.size)}</p>
      </div>
    </div>
  );
}

export default AttachmentPreview;
