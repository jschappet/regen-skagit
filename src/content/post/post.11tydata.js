module.exports = {
  layout: "layouts/page.njk",

  permalink: data => {
    return `/posts/${data.page.fileSlug}/`;
  }
};
