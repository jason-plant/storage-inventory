/**
 * Client-side image compression utilities using `browser-image-compression`.
 * - Handles EXIF orientation and uses Web Workers for speed.
 * - Converts to WebP when supported for better size savings.
 *
 * IMPORTANT: This module avoids importing `browser-image-compression` at module
 * scope to remain safe during server-side builds. The library is dynamically
 * imported at runtime inside `compressImage` so it's only loaded in the browser.
 */

export const DEFAULT_MAX_UPLOAD_MB = 0.5;
export const DEFAULT_MAX_UPLOAD_BYTES = Math.round(DEFAULT_MAX_UPLOAD_MB * 1024 * 1024);

export async function supportsWebP() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    if (!canvas.getContext) return false;
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch (e) {
    return false;
  }
}

export type CompressOptions = {
  maxSize?: number; // max width or height in px (default 1280)
  quality?: number; // 0-1 (default 0.8)
  mimeType?: string | null; // override mime type (if null, auto-detect)
  maxSizeMB?: number | null; // optional: max target size in MB (browser-image-compression uses this)
};

export type TargetCompressOptions = CompressOptions & {
  targetBytes: number; // desired max output size in bytes
  minQuality?: number; // lower bound for quality (default 0.5)
  maxIterations?: number; // maximum compression attempts (default 6)
  minMaxSize?: number; // lower bound for maxSize (default 640)
};

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("compressImage must be called in the browser");
  }

  const { maxSize = 1280, quality = 0.8, maxSizeMB = null } = opts;

  const useWebP = opts.mimeType ? opts.mimeType === "image/webp" : await supportsWebP();
  const fileType = opts.mimeType || (useWebP ? "image/webp" : file.type || "image/jpeg");

  const options = {
    maxWidthOrHeight: maxSize,
    initialQuality: quality,
    fileType,
    useWebWorker: true,
    ...(maxSizeMB ? { maxSizeMB } : {}),
  };

  // Dynamically import the browser-only library at runtime (client only)
  const { default: imageCompression } = await import("browser-image-compression");

  // browser-image-compression handles EXIF orientation and returns a File/Blob
  const compressed: Blob = await imageCompression(file, options as any);

  // If the library returned a File, return it directly
  if (compressed instanceof File) return compressed;

  // Otherwise wrap blob in a file with a sensible name
  const ext = fileType === "image/webp" ? "webp" : fileType.includes("png") ? "png" : "jpg";
  const newName = file.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([compressed], newName, { type: fileType });
}

/**
 * Attempt to compress to a target byte size by iteratively reducing quality and size.
 * This is best-effort and may still exceed the target for some images.
 */
export async function compressImageToTarget(file: File, opts: TargetCompressOptions): Promise<File> {
  const {
    targetBytes,
    maxSize = 1280,
    quality = 0.8,
    mimeType = null,
    minQuality = 0.5,
    maxIterations = 6,
    minMaxSize = 640,
  } = opts;

  const targetMB = targetBytes / (1024 * 1024);

  let currentMaxSize = maxSize;
  let currentQuality = quality;

  let best = await compressImage(file, {
    maxSize: currentMaxSize,
    quality: currentQuality,
    mimeType,
    maxSizeMB: targetMB,
  });

  if (best.size <= targetBytes) return best;

  for (let i = 1; i < maxIterations; i++) {
    currentQuality = Math.max(minQuality, Number((currentQuality - 0.1).toFixed(2)));
    currentMaxSize = Math.max(minMaxSize, Math.round(currentMaxSize * 0.85));

    const next = await compressImage(file, {
      maxSize: currentMaxSize,
      quality: currentQuality,
      mimeType,
      maxSizeMB: targetMB,
    });

    if (next.size < best.size) best = next;
    if (next.size <= targetBytes) return next;
  }

  return best;
}

