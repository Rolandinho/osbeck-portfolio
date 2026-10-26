/**
 * Läser alla bilder i src/images/, extraherar EXIF med exifr
 * och skriver src/data/photos.json.
 *
 * Körs automatiskt via "prebuild" i package.json.
 * Manuellt: npm run extract-exif
 *
 * Befintliga manuella fält (title, category, featured, slug)
 * bevaras – bara EXIF-data uppdateras.
 *
 * Mappar som börjar med _ hoppas över (t.ex. _assets).
 */
const exifr = require("exifr");
const fs = require("fs");
const path = require("path");
const IMAGES_DIR = path.join(__dirname, "../src/images");
const OUTPUT_FILE = path.join(__dirname, "../src/data/photos.json");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function run() {
  const existing = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"))
    : [];
  const existingMap = Object.fromEntries(existing.map(p => [p.filename, p]));

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Samla alla bildfiler rekursivt – undermappar används som kategori
  // Mappar som börjar med _ hoppas över
  function collectFiles(dir, category) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let result = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_")) continue;
        result = result.concat(collectFiles(fullPath, entry.name));
      } else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        result.push({ filepath: fullPath, filename: entry.name, category });
      }
    }
    return result;
  }

  const files = collectFiles(IMAGES_DIR, "okategoriserad");

  const photos = [];
  for (const { filepath, filename, category: folderCategory } of files) {
    let exif = {};
    try {
      exif = await exifr.parse(filepath, {
        pick: ["DateTimeOriginal", "Make", "Model", "LensModel",
               "FocalLength", "FNumber", "ExposureTime", "ISO"]
      }) || {};
    } catch (e) {
      console.warn(`  EXIF misslyckades för ${filename}: ${e.message}`);
    }

    const prev = existingMap[filename] || {};
    const baseName = path.basename(filename, path.extname(filename));
    const relPath = filepath.replace(IMAGES_DIR, "").replace(/\\/g, "/");

    photos.push({
      filename,
      slug: prev.slug || slugify(baseName),
      title: prev.title || baseName,
      category: prev.category || folderCategory,
      featured: prev.featured || false,
      src: `/images${relPath}`,
      exif: {
        date: exif.DateTimeOriginal
          ? exif.DateTimeOriginal.toISOString().split("T")[0]
          : prev.exif?.date || null,
        camera: exif.Model || prev.exif?.camera || null,
        lens: exif.LensModel || prev.exif?.lens || null,
        focalLength: exif.FocalLength ? `${exif.FocalLength} mm` : prev.exif?.focalLength || null,
        aperture: exif.FNumber ? `f/${exif.FNumber}` : prev.exif?.aperture || null,
        shutterSpeed: exif.ExposureTime
          ? `1/${Math.round(1 / exif.ExposureTime)} s`
          : prev.exif?.shutterSpeed || null,
        iso: exif.ISO || prev.exif?.iso || null,
      },
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(photos, null, 2));
  console.log(`✓ extract-exif: ${photos.length} foton → src/data/photos.json`);
}

run().catch(err => { console.error(err); process.exit(1); });