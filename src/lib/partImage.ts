/** Serves uploaded part images (GET /part-images?partNumber=SKU). */
export function partImageUrl(partNumber: string, cacheBust?: number): string {
  const sku = encodeURIComponent(partNumber.trim());
  const v = cacheBust ? `&v=${cacheBust}` : "";
  return `/part-images?partNumber=${sku}${v}`;
}

export async function uploadPartImage(partNumber: string, file: File): Promise<{ ok: boolean; message?: string }> {
  const fd = new FormData();
  fd.append("partNumber", partNumber.trim());
  fd.append("file", file);

  const res = await fetch("/part-images", { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) {
    return { ok: false, message: data?.message ?? "Image upload failed." };
  }
  return { ok: true };
}
