"use client";

import { AttachmentPreview } from "./AttachmentPreview";
import type { AttachedFile } from "./FileDropZone";

// ===========================================
// Types
// ===========================================

interface AttachmentListProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  layout?: "horizontal" | "grid";
  previewSize?: "sm" | "md" | "lg";
}

// ===========================================
// Utilities
// ===========================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===========================================
// Component
// ===========================================

export function AttachmentList({
  files,
  onRemove,
  onClearAll,
  layout = "horizontal",
  previewSize = "md",
}: AttachmentListProps) {
  if (files.length === 0) return null;

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  const layoutClasses = {
    horizontal: "flex flex-wrap gap-3",
    grid: "grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6",
  };

  return (
    <div className="space-y-3">
      {/* Header with count and clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
            {files.length} file{files.length !== 1 ? "s" : ""} attached
          </span>
          <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            ({formatFileSize(totalSize)})
          </span>
        </div>

        {onClearAll && files.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-xs hover:text-red-400 transition-colors duration-200"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* File previews */}
      <div className={layoutClasses[layout]}>
        {files.map((file) => (
          <AttachmentPreview
            key={file.id}
            file={file}
            onRemove={onRemove}
            size={previewSize}
          />
        ))}
      </div>
    </div>
  );
}

export default AttachmentList;
