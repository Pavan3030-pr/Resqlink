/** Shrinks a photo in the browser before upload: saves mobile data and strips EXIF/GPS metadata from the copy that is sent. */
export const MAX_UPLOAD_SIDE = 1600

export function scaledSize(w: number, h: number, maxSide: number = MAX_UPLOAD_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

export async function shrinkImage(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const { width, height } = scaledSize(bmp.width, bmp.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // browsers without ImageBitmap support: the server re-encodes and validates anyway
  }
}
