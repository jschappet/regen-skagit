const Image = require("@11ty/eleventy-img");
const fs = require("fs");
const path = require("path");

async function processImage(src, options = {}) {
  const inputPath = path.resolve(src);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Image not found on disk: ${inputPath}`);
  }

  const widths = options.widths || [320, 640, 960, 1280];
  const formats = options.formats || ["avif", "webp", "jpeg"];
  const outputDir = "./dist/assets/images/";
  const urlPath = "/assets/images/";

  // Add caching via a persistent cache folder
  const cacheOptions = {
    duration: "30d",        // keeps cached images valid for 30 days
    directory: "./_image-cache/"
  };

  return Image(inputPath, {
    widths,
    formats,
    urlPath,
    outputDir,
    cacheOptions,
  });
}

module.exports = { processImage };
