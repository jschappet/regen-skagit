const { isPublished } = require('../../_11ty/research.cjs');
module.exports = {
  layout: 'layouts/result.njk',
  doc_type: 'results',
  eleventyComputed: {
    permalink: data => isPublished({data}) ? `/results/${data.page.fileSlug}/` : false,
    eleventyExcludeFromCollections: data => !isPublished({data}),
  },
};
