const { isPublished } = require('../../_11ty/research.cjs');
module.exports = {
  layout: 'layouts/experiment.njk',
  doc_type: 'experiment',
  eleventyComputed: {
    permalink: data => isPublished({data}) ? `/experiments/${data.page.fileSlug}/` : false,
    eleventyExcludeFromCollections: data => !isPublished({data}),
  },
};
