// image.js
const { processImage } = require("./imageCore");
const Image = require("@11ty/eleventy-img");

async function imageShortcode(src, alt, options = {}) {
  if (!alt) throw new Error(`Missing alt text for image: ${src}`);

  const metadata = await processImage(src, options);

  return Image.generateHTML(metadata, {
    alt,
    sizes: options.sizes || "100vw",
    class: options.class || "",
    loading: "lazy",
    decoding: "async",
  });
}

module.exports = imageShortcode;
