/* vis-timeline stays outside Alpine's reactive proxy; private notes stay in this closure. */
function createExperimentTimeline(host, rows, preview, experimentUrl) {
  if (!window.vis?.Timeline) throw new Error('Timeline unavailable. You can still open your experiments below.');
  let phases = new Map();
  const textElement = (tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  const data = entries => {
    phases = new Map();
    const groups = entries.map((row, order) => ({id: row.id, content: '', name: row.title, order, undated: !row.blocks.length}));
    const items = entries.flatMap(row => row.blocks.map(block => {
      const id = `${row.id}:${block.key}`;
      phases.set(id, block);
      return {id, group: row.id, content: '', start: block.start,
        ...(block.end && block.end - block.start >= 86400000 * 4 ? {end: block.end, type: 'range'} : {type: 'box'}),
        className: `phase-${block.key}${block.open ? ' phase-open' : ''}`};
    }));
    return {groups, items};
  };
  const initial = data(rows);
  const timeline = new window.vis.Timeline(host, initial.items, initial.groups, {
    editable: false, groupEditable: false, selectable: true,
    stack: true, groupOrder: 'order', groupHeightMode: 'auto',
    orientation: {axis: 'top', item: 'top'},
    showCurrentTime: false, zoomKey: 'ctrlKey', zoomMin: 86400000, zoomMax: 86400000 * 365 * 100,
    margin: {item: {horizontal: 0, vertical: 12}, axis: 16},
    minHeight: 160, maxHeight: 560, verticalScroll: true,
    template(item) {
      const phase = phases.get(item.id);
      const button = textElement('button', phase.label + (phase.open ? ' →' : ''));
      button.type = 'button';
      button.className = 'journey-phase-button';
      button.setAttribute('aria-label', `${phase.title}: ${phase.label}, ${phase.dates}. Read notes below.`);
      button.setAttribute('aria-controls', 'journey-phase-notes');
      // Use textContent and DOM nodes: neither titles nor notebook text become HTML.
      button.title = [phase.dates, ...phase.notes.map(note => note.text)].join('\n\n').slice(0, 500);
      button.addEventListener('focus', () => preview(phase));
      button.addEventListener('click', () => preview(phase));
      return button;
    },
    groupTemplate(group) {
      const label = document.createElement('div');
      const link = textElement('a', group.name);
      link.href = experimentUrl(group.id); link.className = 'link';
      label.appendChild(link);
      if (group.undated) label.appendChild(textElement('small', 'Taking shape · no dates recorded'));
      return label;
    },
  });
  timeline.on('itemover', event => { const phase = phases.get(event.item); if (phase) preview(phase); });
  timeline.on('select', event => { const phase = phases.get(event.items[0]); if (phase) preview(phase); });
  const fit = () => {
    // Give short/new journeys context instead of zooming all the way into minutes.
    const items = timeline.getItemRange();
    const now = new Date();
    const first = items.min || now, last = items.max || now;
    const sameMonth = first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth();
    timeline.setWindow(new Date(first.getFullYear(), first.getMonth() - (sameMonth ? 1 : 0), 1),
      new Date(last.getFullYear(), last.getMonth() + 1, 1), {animation: false});
  };
  fit();
  return {
    update(entries) {
      const next = data(entries);
      timeline.setData(next);
      fit();
    },
    fit,
    zoomIn() { timeline.zoomIn(0.4, {animation: false}); },
    zoomOut() { timeline.zoomOut(0.4, {animation: false}); },
    earlier() { const range = timeline.getWindow(); const shift = (range.end - range.start) / 2; timeline.setWindow(+range.start - shift, +range.end - shift, {animation:false}); },
    later() { const range = timeline.getWindow(); const shift = (range.end - range.start) / 2; timeline.setWindow(+range.start + shift, +range.end + shift, {animation:false}); },
    destroy() { timeline.destroy(); phases.clear(); },
  };
}
if (typeof window !== 'undefined') window.createExperimentTimeline = createExperimentTimeline;
