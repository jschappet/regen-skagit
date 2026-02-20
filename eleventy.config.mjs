import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import eleventyNavigationPlugin from '@11ty/eleventy-navigation';

import imageShortcode from "./src/_11ty/image.js";
import bgImageShortcode from "./src/_11ty/bgImage.js";
import heroBlockShortcode from "./src/_11ty/heroBlock.js";



export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('src/assets/js/');
  eleventyConfig.addPassthroughCopy('src/assets/json/');

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);
  eleventyConfig.addNunjucksAsyncShortcode("bgImage", bgImageShortcode);
  eleventyConfig.addLiquidShortcode("bgImage", bgImageShortcode);

  eleventyConfig.addNunjucksAsyncShortcode("heroBlock", heroBlockShortcode);


  eleventyConfig.addPassthroughCopy(
    {"src/assets/images/favicon": "assets/images/favicon"});

    eleventyConfig.addPassthroughCopy(
    {"src/content/slides/slides.txt": "slides/slides.md"});
  eleventyConfig.addPassthroughCopy(
    {"src/content/slides/images/*.jpg": "slides/images/"});
  

  eleventyConfig.addPassthroughCopy(
    {"src/_data/home_page.json": "/editor/data.json"});
  eleventyConfig.addPassthroughCopy(
    {"src/assets/images/og-image.jpeg": "assets/images/og-image.jpg"});

  eleventyConfig.addPassthroughCopy(
    {"node_modules/@flaticon/flaticon-uicons/css/regular": "assets/uicons/css"});


  eleventyConfig.on('eleventy.before', async () => {
    const tailwindInputPath = path.resolve('./src/styles/index.css');
    const tailwindOutputPath = './dist/assets/css/index.css';
    const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');
    const outputDir = path.dirname(tailwindOutputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await postcss([tailwindcss()]).process(cssContent, {
      from: tailwindInputPath,
      to: tailwindOutputPath,
    });
    fs.writeFileSync(tailwindOutputPath, result.css);

  });

  eleventyConfig.addCollection("events", collectionApi => {
    return collectionApi
      .getAll()
      .filter(item =>
        item.page.filePathStem.startsWith("/content/events/")
      )
      .sort((a, b) => new Date(a.data.event_date) - new Date(b.data.event_date));
  });

    eleventyConfig.addCollection("organizations", collectionApi => {
    return collectionApi
      .getAll()
      .filter(item =>
        item.page.filePathStem.startsWith("/content/organizations/")
      )
      .sort((a, b) => new Date(a.data.title) - new Date(b.data.title));
  });


  eleventyConfig.addFilter('featuredFilter', function(collection) {
    const filtered = collection.filter(item => item.data.featured == true)
    return filtered;
});

  eleventyConfig.addCollection("upcomingEvents", collectionApi => {
    return collectionApi.getAll().filter(item => {
      // only items in events folder
      if (!item.inputPath.includes("/content/events/")) return false;

      const eventDate = new Date(item.data.event_end_date);
      return eventDate >= new Date();
    });


  });


    eleventyConfig.addCollection("pastEvents", collectionApi => {
      return collectionApi.getAll().filter(item => {
        if (!item.inputPath.includes("/content/events/")) return false;

        const eventDate = new Date(item.data.event_end_date);
        return eventDate < new Date();
      }).sort((a, b) => new Date(b.data.event_end_date) - new Date(a.data.event_end_date)); // newest first
    });
    
  return {
    dir: { input: 'src', output: 'dist' },
  };
}