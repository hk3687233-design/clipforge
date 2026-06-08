/**
 * Generate a stable device fingerprint from browser properties.
 * This is NOT perfect but good enough to enforce 1-device-per-license.
 * Stored in localStorage so it persists across sessions on the same browser.
 */

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("ClipForge🔑", 2, 2);
    return canvas.toDataURL().slice(-50);
  } catch {
    return "canvas-err";
  }
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr";

  // Check localStorage for existing fingerprint
  const stored = localStorage.getItem("clipforge_device_id");
  if (stored) return stored;

  // Generate new fingerprint
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    getCanvasFingerprint(),
  ].join("|");

  const fingerprint = "dev_" + hashString(components);
  localStorage.setItem("clipforge_device_id", fingerprint);
  return fingerprint;
}
