module.exports = {
  layout: "layouts/event.njk",

  permalink: data => {
    return `/events/${data.page.fileSlug}/`;
  }
};
