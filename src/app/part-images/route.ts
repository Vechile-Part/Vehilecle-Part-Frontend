import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const ALLOWED_TYPES = new Set(Object.values(MIME_BY_EXT));
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;

function sanitizePartNumber(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > 64) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(s)) return null;
  return s;
}

function assetsDir() {
  return path.join(process.cwd(), "public", "assets");
}

async function findImageFile(partNumber: string): Promise<{ filePath: string; mime: string } | null> {
  const dir = assetsDir();
  for (const ext of EXTENSIONS) {
    const filePath = path.join(dir, `${partNumber}${ext}`);
    try {
      await access(filePath);
      return { filePath, mime: MIME_BY_EXT[ext] };
    } catch {
      // try next extension
    }
  }
  return null;
}

async function removeOtherExtensions(partNumber: string, keepExt: string) {
  const dir = assetsDir();
  await Promise.all(
    EXTENSIONS.filter((ext) => ext !== keepExt).map(async (ext) => {
      try {
        await unlink(path.join(dir, `${partNumber}${ext}`));
      } catch {
        // ignore missing
      }
    }),
  );
}

export async function GET(req: NextRequest) {
  const partNumber = sanitizePartNumber(req.nextUrl.searchParams.get("partNumber") ?? "");
  if (!partNumber) {
    return NextResponse.json({ message: "Invalid part number." }, { status: 400 });
  }

  const found = await findImageFile(partNumber);
  if (!found) {
    return new NextResponse(null, { status: 404 });
  }

  const body = await readFile(found.filePath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "public, max-age=60",
    },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const partNumber = sanitizePartNumber(String(form.get("partNumber") ?? ""));
  const file = form.get("file");

  if (!partNumber || !(file instanceof File)) {
    return NextResponse.json({ message: "Part number and image file are required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ message: "Use a PNG, JPEG, or WebP image." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ message: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  const ext =
    file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";

  await mkdir(assetsDir(), { recursive: true });
  await removeOtherExtensions(partNumber, ext);
  await writeFile(path.join(assetsDir(), `${partNumber}${ext}`), buffer);

  return NextResponse.json({
    ok: true,
    url: `/part-images?partNumber=${encodeURIComponent(partNumber)}`,
  });
}
