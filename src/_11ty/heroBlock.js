const path = require("path");
const nunjucks = require("nunjucks");
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

// Make a nunjucks environment that points to your _includes
const njkEnv = nunjucks.configure(path.join(__dirname, "../_includes"), {
  autoescape: true,
  noCache: true,
});

async function heroBlock(heroData) {
    //console.log("heroBlock shortcode called with heroData:", heroData);
  let bgUrl = "";

  if (heroData.image) {
    const metadata = await processImage(heroData.image);
    const largest = Math.max(...metadata.jpeg.map(m => m.width));
    const image = metadata.jpeg.find(m => m.width === largest);
    bgUrl = image.url;
  }
  let imageHtml = {};



  if (heroData.panels && heroData.panels.length > 0 && heroData.panels[0].image) {
    for (let panel of heroData.panels) {
      if (panel.image) {
        imageHtml[panel.image.src] = 
            await imageShortcode(panel.image.src, panel.image.alt, {});   
      }
    }
  }
   
  // Render the template with Nunjucks

  let templateFile = "components/hero/" + heroData.format + ".njk";
  return new Promise((resolve, reject) => {
    njkEnv.render(templateFile, { heroData, bgUrl , imageHtml }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

module.exports = heroBlock;
