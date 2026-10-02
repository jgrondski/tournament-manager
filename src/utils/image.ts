/**
 * Resizes and compresses player avatar images client-side using HTML5 Canvas.
 * Outputs full avatar (max 256x256) and thumbnail (32x32).
 */
export interface ProcessedAvatar {
  avatarBlob: Blob;
  thumbnailBlob: Blob;
  avatarDataUrl: string;
  thumbnailDataUrl: string;
}

function resizeToCanvas(
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  targetSize: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Crop to square from center
  const minDim = Math.min(srcW, srcH);
  const sx = (srcW - minDim) / 2;
  const sy = (srcH - minDim) / 2;

  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
  }
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob export failed'));
      },
      'image/webp',
      quality
    );
  });
}

export async function processAvatarImage(
  fileOrBlob: File | Blob,
  avatarSize = 256,
  thumbSize = 32
): Promise<ProcessedAvatar> {
  const bitmap = typeof createImageBitmap !== 'undefined'
    ? await createImageBitmap(fileOrBlob)
    : await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(fileOrBlob);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });

  const width = bitmap.width;
  const height = bitmap.height;

  const avatarCanvas = resizeToCanvas(bitmap, width, height, avatarSize);
  const thumbCanvas = resizeToCanvas(bitmap, width, height, thumbSize);

  const [avatarBlob, thumbnailBlob] = await Promise.all([
    canvasToBlob(avatarCanvas, 0.85),
    canvasToBlob(thumbCanvas, 0.8),
  ]);

  const avatarDataUrl = avatarCanvas.toDataURL('image/webp', 0.85);
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/webp', 0.8);

  return {
    avatarBlob,
    thumbnailBlob,
    avatarDataUrl,
    thumbnailDataUrl,
  };
}
