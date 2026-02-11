module.exports = {
  layout: "layouts/organization.njk",

  permalink: data => {
    return `/organizations/${data.page.fileSlug}/`;
  }
};
