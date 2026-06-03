export function createJpegSnapshot(videoElement, options = {}) {
  const { maxWidth = 1280, quality = 0.82 } = options;

  if (
    typeof document === "undefined" ||
    !videoElement ||
    !videoElement.videoWidth ||
    !videoElement.videoHeight
  ) {
    return "";
  }

  const sourceWidth = Math.max(1, videoElement.videoWidth);
  const sourceHeight = Math.max(1, videoElement.videoHeight);
  const scale = Math.min(1, maxWidth / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return "";
  }

  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
