// bgImage.js
const { processImage } = require("./imageCore");

async function bgImageShortcode(src, options = {}) {
  console.log("bgImageShortcode called with src:", src, "and options:", options);
  if (!src) return ""; // fallback if no image

  const metadata = await processImage(src, options);

  // For background images, just return the largest format URL (jpeg fallback)
  const formats = Object.keys(metadata);
  const largest = Math.max(...metadata.jpeg.map(m => m.width));
  const image = metadata.jpeg.find(m => m.width === largest);
  console.log("bgImageShortcode processed image:", image);
  return `url('${image.url}')`;
}

module.exports = bgImageShortcode;
