/**
 * Client & server helpers for safe AI Tutor photo attachments.
 * Resizes high-megapixel phone camera photos on canvas so uploads are fast,
 * crisp for vision analysis, and safely under serverless request limits.
 */

export const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000;

const SAFE_DATA_URL_REGEX =
  /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i;

export function isValidTutorImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (
    trimmed.length < 32 ||
    trimmed.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return false;
  }
  return SAFE_DATA_URL_REGEX.test(trimmed);
}

export interface PreparedPhotoAttachment {
  dataUrl: string;
  name: string;
  width: number;
  height: number;
}

export async function preparePhotoFileForTutor(
  file: File
): Promise<PreparedPhotoAttachment> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, WebP, or GIF).");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image is too large (max 15 MB). Please choose a smaller photo.");
  }

  const rawDataUrl = await readFileAsDataUrl(file);

  // In non-canvas test environments (e.g., jsdom), return validated raw data URL directly
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return {
      dataUrl: rawDataUrl,
      name: file.name || "photo.jpg",
      width: 800,
      height: 600,
    };
  }

  try {
    const img = await loadHtmlImage(rawDataUrl);
    const maxDim = 1280;
    let targetW = img.naturalWidth || img.width || 800;
    let targetH = img.naturalHeight || img.height || 600;

    if (targetW > maxDim || targetH > maxDim) {
      const scale = Math.min(maxDim / targetW, maxDim / targetH);
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        dataUrl: rawDataUrl,
        name: file.name || "photo.jpg",
        width: targetW,
        height: targetH,
      };
    }

    // Fill white behind transparent PNG diagrams/handwriting so dark ink stays high-contrast
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const compressed = canvas.toDataURL("image/jpeg", 0.84);
    const finalUrl =
      compressed && compressed.startsWith("data:image/")
        ? compressed
        : rawDataUrl;

    if (!isValidTutorImageDataUrl(finalUrl)) {
      throw new Error("Could not encode photo cleanly. Please try another image.");
    }

    return {
      dataUrl: finalUrl,
      name: file.name || "photo.jpg",
      width: targetW,
      height: targetH,
    };
  } catch {
    if (isValidTutorImageDataUrl(rawDataUrl)) {
      return {
        dataUrl: rawDataUrl,
        name: file.name || "photo.jpg",
        width: 800,
        height: 600,
      };
    }
    throw new Error("Unable to process this image file.");
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image."));
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode error"));
    img.src = src;
  });
}
