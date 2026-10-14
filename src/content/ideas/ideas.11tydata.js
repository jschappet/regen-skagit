module.exports = {
  layout: "layouts/ideas.njk",

  permalink: data => {
    return `/ideas/${data.page.fileSlug}/`;
  }
};
