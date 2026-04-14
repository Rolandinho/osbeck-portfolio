const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function(eleventyConfig) {
  // Copy static assets (inkl. undermappar med kategoribilder)
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

  // Image shortcode – generates WebP + original, multiple sizes
  eleventyConfig.addAsyncShortcode("photo", async function(src, alt, sizes = "100vw") {
    const fullSrc = path.join("src", src);
    const metadata = await Image(fullSrc, {
      widths: [400, 800, 1600],
      formats: ["webp", "jpeg"],
      outputDir: "_site/images/optimized/",
      urlPath: "/images/optimized/",
    });
    const imageAttributes = { alt, sizes, loading: "lazy", decoding: "async" };
    return Image.generateHTML(metadata, imageAttributes);
  });

  // Filter: get photos by category
  eleventyConfig.addFilter("byCategory", function(photos, category) {
    if (!category || category === "alla") return photos;
    return photos.filter(p => p.category === category);
  });

  // Filter: unique categories from photos array
  eleventyConfig.addFilter("uniqueCategories", function(photos) {
    const cats = photos.map(p => p.category);
    return [...new Set(cats)];
  });

  // Filter: find adjacent photo (prev/next)
  eleventyConfig.addFilter("adjacent", function(photos, currentSlug, direction) {
    const idx = photos.findIndex(p => p.slug === currentSlug);
    if (direction === "prev") return photos[idx - 1] || null;
    if (direction === "next") return photos[idx + 1] || null;
    return null;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "data",
    },
  };
};