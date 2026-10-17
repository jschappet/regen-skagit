class ExperimentCatalog {
  data() { return { permalink: '/experiments/catalog.json', eleventyExcludeFromCollections: true }; }
  render(data) {
    return JSON.stringify((data.collections.experiments || []).map(item => ({
      experiment_id: item.data.experiment_id, title: item.data.title, url: item.url,
    })));
  }
}
module.exports = ExperimentCatalog;
