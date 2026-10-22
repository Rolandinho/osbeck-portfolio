
const exifr = require("exifr");
const fs = require("fs");
const path = require("path");

const IMAGES_DIR = path.join(__dirname, "../src/images");
const OUTPUT_FILE = path.join(__dirname, "../src/data/photos.json");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "photo";
}

function uniqueSlug(preferred, extension, category, used) {
  const base = slugify(preferred);
  const ext = extension.replace(".", "");
  const candidates = [
    base,
    `${base}-${ext}`,
    `${slugify(category)}-${base}-${ext}`
  ];

  for (const candidate of candidates) {
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }

  let number = 2;
  let candidate;
  do {
    candidate = `${base}-${ext}-${number++}`;
  } while (used.has(candidate));

  used.add(candidate);
  return candidate;
}

function collectFiles(dir, category = "okategoriserad") {
  if (!fs.existsSync(dir)) return [];

  let result = [];

  const entries = fs.readdirSync(dir, {
    withFileTypes: true
  }).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) continue;
      result.push(...collectFiles(fullPath, entry.name));
    } else if (
      entry.isFile() &&
      EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    ) {
      result.push({
        filepath: fullPath,
        filename: entry.name,
        category
      });
    }
  }

  return result;
}

async function run() {
  const existing = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"))
    : [];

  const previousBySrc = new Map(
    existing.filter(p => p.src).map(p => [p.src, p])
  );

  const filenameCounts = new Map();
  for (const p of existing) {
    filenameCounts.set(
      p.filename,
      (filenameCounts.get(p.filename) || 0) + 1
    );
  }

  const previousByFilename = new Map(
    existing
      .filter(p => filenameCounts.get(p.filename) === 1)
      .map(p => [p.filename, p])
  );

  const files = collectFiles(IMAGES_DIR);
  const usedSlugs = new Set();
  const photos = [];
  const warnings = [];

  for (const { filepath, filename, category } of files) {
    const relPath = "/" + path.relative(
      IMAGES_DIR, filepath
    ).split(path.sep).join("/");

    const src = `/images${relPath}`;
    const baseName = path.parse(filename).name;
    const extension = path.extname(filename).toLowerCase();

    const prev = previousBySrc.get(src) ||
      previousByFilename.get(filename) || {};

    let exif = {};

    try {
      exif = await exifr.parse(filepath, {
        pick: [
          "DateTimeOriginal",
          "Make",
          "Model",
          "LensModel",
          "FocalLength",
          "FNumber",
          "ExposureTime",
          "ISO"
        ]
      }) || {};
    } catch (err) {
      warnings.push(`EXIF: ${filename}: ${err.message}`);
    }

    const preferredSlug = prev.slug || slugify(baseName);
    const slug = uniqueSlug(
      preferredSlug, extension, category, usedSlugs
    );

    if (slug !== slugify(preferredSlug)) {
      warnings.push(
        `Dubbel slug: ${preferredSlug} -> ${slug} (${src})`
      );
    }

    const date = exif.DateTimeOriginal;
    const validDate = date instanceof Date &&
      !Number.isNaN(date.getTime());

    photos.push({
      filename,
      slug,
      title: prev.title || baseName,
      category: prev.category || category,
      featured: prev.featured ?? false,
      src,
      exif: {
        date: validDate
          ? date.toISOString().split("T")[0]
          : prev.exif?.date || null,
        camera: exif.Model || prev.exif?.camera || null,
        lens: exif.LensModel || prev.exif?.lens || null,
        focalLength: exif.FocalLength
          ? `${exif.FocalLength} mm`
          : prev.exif?.focalLength || null,
        aperture: exif.FNumber
          ? `f/${exif.FNumber}`
          : prev.exif?.aperture || null,
        shutterSpeed: exif.ExposureTime > 0
          ? `1/${Math.round(1 / exif.ExposureTime)} s`
          : prev.exif?.shutterSpeed || null,
        iso: exif.ISO || prev.exif?.iso || null
      }
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), {
    recursive: true
  });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(photos, null, 2) + "\n"
  );

  const removed = existing.filter(
    p => !photos.some(n => n.src === p.src)
  );

  console.log(`✓ ${photos.length} bilder registrerade`);
  console.log(`✓ ${removed.length} gamla poster borttagna`);
  console.log(`✓ Alla slugs är unika`);

  if (warnings.length) {
    console.log("\nInformation:");
    warnings.forEach(w => console.log(" - " + w));
  }

  console.log(`✓ Skrev ${OUTPUT_FILE}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
