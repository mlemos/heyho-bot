"use client";

import { useCallback, useState, useRef } from "react";

// ===========================================
// Types
// ===========================================

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string; // Data URL for images
}

interface FileDropZoneProps {
  onFilesAdded: (files: AttachedFile[]) => void;
  maxFileSize?: number; // in bytes, default 20MB
  maxTotalSize?: number; // in bytes, default 50MB
  currentFiles?: AttachedFile[];
  disabled?: boolean;
  className?: string;
}

// ===========================================
// Utilities
// ===========================================

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

async function createImagePreview(file: File): Promise<string | undefined> {
  if (!isImageFile(file)) return undefined;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

// ===========================================
// Component
// ===========================================

export function FileDropZone({
  onFilesAdded,
  maxFileSize = 20 * 1024 * 1024, // 20MB
  maxTotalSize = 50 * 1024 * 1024, // 50MB
  currentFiles = [],
  disabled = false,
  className = "",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTotalSize = currentFiles.reduce((sum, f) => sum + f.file.size, 0);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const files = Array.from(fileList);
      const validFiles: AttachedFile[] = [];
      let newTotalSize = currentTotalSize;

      for (const file of files) {
        // Check individual file size
        if (file.size > maxFileSize) {
          setError(`File "${file.name}" exceeds ${formatFileSize(maxFileSize)} limit`);
          continue;
        }

        // Check total size
        if (newTotalSize + file.size > maxTotalSize) {
          setError(`Total size would exceed ${formatFileSize(maxTotalSize)} limit`);
          break;
        }

        newTotalSize += file.size;

        // Create preview for images
        const preview = await createImagePreview(file);

        validFiles.push({
          id: generateId(),
          file,
          preview,
        });
      }

      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    },
    [currentTotalSize, maxFileSize, maxTotalSize, onFilesAdded]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [disabled, processFiles]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processFiles]
  );

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6
          transition-all duration-200 cursor-pointer
          min-h-[120px] flex flex-col items-center justify-center gap-2
          ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Icon */}
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isDragging ? "bg-blue-500/20" : "bg-zinc-800"}
          `}
        >
          <svg
            className={`w-6 h-6 ${isDragging ? "text-blue-400" : "text-zinc-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className={`text-sm ${isDragging ? "text-blue-400" : "text-zinc-300"}`}>
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            or <span className="text-blue-400">click to browse</span>
          </p>
        </div>

        {/* Supported formats hint */}
        <p className="text-xs text-zinc-600 mt-2">
          PDF, images, Office docs, audio, video, and more
        </p>

        {/* Size info */}
        <p className="text-xs text-zinc-600">
          Max {formatFileSize(maxFileSize)} per file, {formatFileSize(maxTotalSize)} total
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

export default FileDropZone;
