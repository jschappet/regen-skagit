// d3-flows.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function renderFlows(svgSelector, sliderSelector, weekLabelSelector, basePath) {

  const svg = d3.select(svgSelector);
  const tooltip = d3.select(".tooltip");

  const width = 1000;
  const height = 600;

  const entityFilter = d3.select("#entityFilter");
  const resourceFilter = d3.select("#resourceFilter");
  const startDateInput = d3.select("#startDate");
  const endDateInput = d3.select("#endDate");
  const timeline = d3.select(sliderSelector);
  const weekLabel = d3.select(weekLabelSelector);

  const resourceScale = {
    "Hours": 1,
    "donation": 0.01,
    "Meals": 0.5,
    "USD": 0.01,
    "Plants": 0.2,
    "Tools": 0.5,
    "Product": 1
  };

  const colorScale = d3.scaleOrdinal()
    .domain(["Hours", "Meals", "USD", "Plants", "Tools", "Product"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]);

  let entities = {};
  let resources = [];

  // Initial fetch populates dropdowns and graph
  fetchAndRender();

  // update graph on filter change
  [entityFilter, resourceFilter, startDateInput, endDateInput, timeline].forEach(sel => {
    sel.on("change input", () => fetchAndRender());
  });

  function getQueryParams() {
    const params = new URLSearchParams();
    const entity = entityFilter.node().value;
    const resource = resourceFilter.node().value;
    const start = startDateInput.node().value;
    const end = endDateInput.node().value;
    const weekIndex = +timeline.node().value;

    if (entity) params.append("entity", entity);
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    params.append("limit", 1000); // server-side limit
    params.append("offset", 0);
    params.append("direction", "Both");

    // Optionally adjust start/end by weekIndex
    if (weekIndex) {
      const weekMillis = 7 * 24 * 60 * 60 * 1000;
      const windowStart = start ? new Date(start) : new Date(0);
      const adjustedStart = new Date(windowStart.getTime() + weekIndex * weekMillis);
      const adjustedEnd = new Date(adjustedStart.getTime() + weekMillis);
      params.set("start", adjustedStart.toISOString().slice(0,10));
      params.set("end", adjustedEnd.toISOString().slice(0,10));
    }

    return params.toString();
  }

  async function fetchAndRender() {
    const queryString = getQueryParams();
    const url = `${basePath}?${queryString}`;
    console.log("Fetching ledger data:", url);

    const response = await fetch(url);
    if (!response.ok) return console.error("Failed to fetch ledger data");

    const data = await response.json();

    // Populate dropdowns once if not yet populated
    if (Object.keys(entities).length === 0) {
      entities = Object.fromEntries(data.entities.map(e => [e.id, e]));
      entityFilter.selectAll("option.entity")
        .data(data.entities)
        .enter()
        .append("option")
        .attr("class","entity")
        .attr("value", d => d.id)
        .text(d => d.name);
    }

    if (resources.length === 0) {
      resources = data.resources;
      resourceFilter.selectAll("option.resource")
        .data(resources)
        .enter()
        .append("option")
        .attr("class","resource")
        .attr("value", d => d)
        .text(d => d);
    }

    renderGraph(data);
  }

  function renderGraph(response) {
    const allData = response.ledger;

    allData.forEach(d => { d.date = new Date(d.timestamp); });

    const nodeById = new Map();
    allData.forEach(d => {
      nodeById.set(d.from_entity, { id: d.from_entity, name: entities[d.from_entity]?.name });
      nodeById.set(d.to_entity, { id: d.to_entity, name: entities[d.to_entity]?.name });
    });

    function aggregateLinks(data) {
      const linkMap = new Map();
      data.forEach(d => {
        const key = `${d.from_entity}|${d.to_entity}|${d.resource_type}`;
        if (!linkMap.has(key)) {
          linkMap.set(key, {
            sourceId: d.from_entity,
            targetId: d.to_entity,
            sourceName: entities[d.from_entity]?.name,
            targetName: entities[d.to_entity]?.name,
            resource_type: d.resource_type,
            quantities: [d.quantity_value],
            dates: [d.date]
          });
        } else {
          const l = linkMap.get(key);
          l.quantities.push(d.quantity_value);
          l.dates.push(d.date);
        }
      });
      return Array.from(linkMap.values()).map(l => {
        const total = l.quantities.reduce((a,b) => a+b, 0);
        return { ...l, quantity: total, label: `${total} ${l.resource_type}` };
      });
    }

    const allLinks = aggregateLinks(allData).map((l,i) => ({
      ...l,
      index: i,
      source: nodeById.get(l.sourceId),
      target: nodeById.get(l.targetId)
    }));

    const allNodes = Array.from(nodeById.values());

    svg.selectAll("g.nodes").remove();
    svg.selectAll("g.links").remove();
    svg.selectAll("g.labels").remove();

    const simulation = d3.forceSimulation(allNodes)
      .force("link", d3.forceLink(allLinks).id(d=>d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-450))
      .force("center", d3.forceCenter(width/2, height/2));

    const link = svg.append("g")
      .attr("class","links")
      .selectAll("path")
      .data(allLinks)
      .enter()
      .append("path")
      .attr("stroke-width", d => Math.min(Math.sqrt(d.quantity*(resourceScale[d.resource_type]||1)), 8))
      .attr("stroke", d => colorScale(d.resource_type))
      .attr("stroke-opacity",0.75)
      .attr("stroke-linecap","round")
      .attr("fill","none")
      .attr("marker-end","url(#arrowhead)");

    const node = svg.append("g")
      .attr("class","nodes")
      .selectAll("g")
      .data(allNodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start",(event,d)=>{ if(!event.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag",(event,d)=>{ d.fx=event.x; d.fy=event.y; })
        .on("end",(event,d)=>{ if(!event.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; })
      );

    node.append("circle")
      .attr("r",20)
      .attr("fill","#69b3a2")
      .on("mouseover",(event,d)=>{
        tooltip.transition().duration(200).style("opacity",0.9);
        const connected = allLinks.filter(l=>l.source.id===d.id||l.target.id===d.id);
        tooltip.html(`<strong>${d.name}</strong><br/>${connected.map(l=>l.label).join("<br/>")}`)
          .style("left",(event.pageX+10)+"px")
          .style("top",(event.pageY-20)+"px");
      })
      .on("mouseout",()=>tooltip.transition().duration(200).style("opacity",0));

    node.append("text")
      .attr("text-anchor","middle")
      .attr("y",5)
      .text(d=>d.name);

    simulation.on("tick",()=>{
      link.attr("d", d=>{
        const dx=d.target.x-d.source.x;
        const dy=d.target.y-d.source.y;
        const dr=Math.sqrt(dx*dx+dy*dy)+d.index*5;
        return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });
      node.attr("transform", d=>`translate(${d.x},${d.y})`);
    });
  }
}