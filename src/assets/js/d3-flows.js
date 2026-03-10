// d3-flows.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function renderFlows(svgSelector, sliderSelector, weekLabelSelector, jsonPath) {

  const svg = d3.select(svgSelector);
  const tooltip = d3.select(".tooltip");

  const width = 1600;
  const height = 900;

  const entityFilter = d3.select("#entityFilter");
  const resourceFilter = d3.select("#resourceFilter");
  const startDateInput = d3.select("#startDate");
  const endDateInput = d3.select("#endDate");

  d3.json(jsonPath).then(response => {

    const allData = response.ledger;

    allData.forEach(d => {
      d.date = new Date(d.timestamp);
    });

    const startDate = d3.min(allData, d => d.date);
    const endDate = d3.max(allData, d => d.date);

    const weekMillis = 7 * 24 * 60 * 60 * 1000;

    const timeline = d3.select(sliderSelector);
    const weekLabel = d3.select(weekLabelSelector);

    timeline.on("input", function () {
      updateGraph(+this.value);
    });

    const resourceScale = {
      "Hours": 1,
      "Meals": 0.5,
      "USD": 0.01,
      "Plants": 0.2,
      "Tools": 0.5,
      "Product": 1
    };

    const colorScale = d3.scaleOrdinal()
      .domain(["Hours","Meals","USD","Plants","Tools","Product"])
      .range(["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b"]);

    // --------------------------------------------------
    // LEGEND
    // --------------------------------------------------

    const legend = svg.append("g")
      .attr("class","legend")
      .attr("transform","translate(20,20)");

    legend.selectAll("g")
      .data(colorScale.domain())
      .enter()
      .append("g")
      .attr("transform",(d,i)=>`translate(0,${i*20})`)
      .each(function(d){

        d3.select(this).append("rect")
          .attr("width",15)
          .attr("height",15)
          .attr("fill",colorScale(d));

        d3.select(this).append("text")
          .attr("x",20)
          .attr("y",12)
          .text(d);

      });

    // --------------------------------------------------
    // ARROWHEAD
    // --------------------------------------------------

    svg.append("defs")
      .append("marker")
      .attr("id","arrowhead")
      .attr("viewBox","0 -5 10 10")
      .attr("refX",30)
      .attr("refY",0)
      .attr("markerWidth",6)
      .attr("markerHeight",6)
      .attr("orient","auto")
      .attr("markerUnits","userSpaceOnUse")
      .append("path")
      .attr("d","M0,-5L10,0L0,5")
      .attr("fill","#666");

    // --------------------------------------------------
    // LINK AGGREGATION
    // --------------------------------------------------

    function aggregateLinks(data){

      const linkMap = new Map();

      data.forEach(d => {

        const key = `${d.from.id}|${d.to.id}|${d.resource_type}`;

        if(!linkMap.has(key)){

          linkMap.set(key,{
            sourceId: d.from.id,
            targetId: d.to.id,
            sourceName: d.from.name,
            targetName: d.to.name,
            resource_type: d.resource_type,
            quantities:[d.quantity_value],
            dates:[d.date]
          });

        } else {

          linkMap.get(key).quantities.push(d.quantity_value);
          linkMap.get(key).dates.push(d.date);

        }

      });

      return Array.from(linkMap.values()).map(l => {

        const total = l.quantities.reduce((a,b)=>a+b,0);

        return {
          sourceId: l.sourceId,
          targetId: l.targetId,
          sourceName: l.sourceName,
          targetName: l.targetName,
          resource_type: l.resource_type,
          quantity: total,
          label: `${total} ${l.resource_type}`,
          dates: l.dates
        };

      });

    }

    // --------------------------------------------------
    // NODE MAP
    // --------------------------------------------------

    const nodeById = new Map();

    allData.forEach(d=>{
      nodeById.set(d.from.id,{id:d.from.id,name:d.from.name});
      nodeById.set(d.to.id,{id:d.to.id,name:d.to.name});
    });

    const allNodes = Array.from(nodeById.values());

    const allLinks = aggregateLinks(allData).map((l,i)=>({
      ...l,
      index:i,
      source:nodeById.get(l.sourceId),
      target:nodeById.get(l.targetId)
    }));

    // --------------------------------------------------
    // FILTER DROPDOWNS
    // --------------------------------------------------

    entityFilter.selectAll("option.entity")
      .data(allNodes)
      .enter()
      .append("option")
      .attr("class","entity")
      .attr("value",d=>d.id)
      .text(d=>d.name);

    const resourceTypes = Array.from(new Set(allData.map(d => d.resource_type)));

    resourceFilter.selectAll("option.resource")
      .data(resourceTypes)
      .enter()
      .append("option")
      .attr("class","resource")
      .attr("value",d=>d)
      .text(d=>d);

      function getTimelineValue() {
  const node = timeline.node();
  return node ? +node.value : 0;
}

entityFilter.on("change", () => updateGraph(getTimelineValue()));
resourceFilter.on("change", () => updateGraph(getTimelineValue()));
    startDateInput.on("change", () => updateGraph(getTimelineValue()));
    endDateInput.on("change", () => updateGraph(getTimelineValue()));

    //entityFilter.on("change", () => updateGraph(+timeline.node().value));
    //resourceFilter.on("change", () => updateGraph(+timeline.node().value));
    //startDateInput.on("change", () => updateGraph(+timeline.node().value));
    //endDateInput.on("change", () => updateGraph(+timeline.node().value));

    updateGraph(0);

    // --------------------------------------------------
    // GRAPH UPDATE
    // --------------------------------------------------

    function updateGraph(weekIndex){

      const entityValue = entityFilter.node().value;
      const resourceValue = resourceFilter.node().value;
      const startValue = startDateInput.node().value;
      const endValue = endDateInput.node().value;

      const windowStart = new Date(startDate.getTime() + weekIndex * weekMillis);
      const windowEnd = new Date(windowStart.getTime() + weekMillis);

      weekLabel.text(`${windowStart.toISOString().slice(0,10)} → ${windowEnd.toISOString().slice(0,10)}`);

      const filteredLinks = allLinks.filter(l => {

        if(entityValue && l.sourceId !== entityValue && l.targetId !== entityValue)
          return false;

        if(resourceValue && l.resource_type !== resourceValue)
          return false;

        if(startValue){
          const start = new Date(startValue);
          if(!l.dates.some(d => d >= start)) return false;
        }

        if(endValue){
          const end = new Date(endValue);
          if(!l.dates.some(d => d <= end)) return false;
        }

        return true;

      });

      const filteredNodesSet = new Set();

      filteredLinks.forEach(l=>{
        filteredNodesSet.add(l.source);
        filteredNodesSet.add(l.target);
      });

      const filteredNodes = Array.from(filteredNodesSet);

      svg.selectAll("g.nodes").remove();
      svg.selectAll("g.links").remove();
      svg.selectAll("g.labels").remove();

      const simulation = d3.forceSimulation(filteredNodes)
        .force("link", d3.forceLink(filteredLinks).id(d=>d.id).distance(160))
        .force("charge", d3.forceManyBody().strength(-450))
        .force("center", d3.forceCenter(width/2,height/2));

      const link = svg.append("g")
        .attr("class","links")
        .selectAll("path")
        .data(filteredLinks)
        .enter()
        .append("path")
        .attr("stroke-width", d=>{
          const raw = Math.sqrt(d.quantity * (resourceScale[d.resource_type] || 1));
          return Math.min(raw,8);
        })
        .attr("stroke",d=>colorScale(d.resource_type))
        .attr("stroke-opacity",0.75)
        .attr("stroke-linecap","round")
        .attr("fill","none")
        .attr("marker-end","url(#arrowhead)");

      const node = svg.append("g")
        .attr("class","nodes")
        .selectAll("g")
        .data(filteredNodes)
        .enter()
        .append("g")
        .call(
          d3.drag()
            .on("start",dragstarted)
            .on("drag",dragged)
            .on("end",dragended)
        );

      node.append("circle")
        .attr("r",20)
        .attr("fill","#69b3a2")
        .on("mouseover",(event,d)=>{

          tooltip.transition().duration(200).style("opacity",0.9);

          const connected = filteredLinks.filter(l =>
            l.source.id === d.id || l.target.id === d.id
          );

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

        link.attr("d",d=>{
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx*dx + dy*dy) + d.index*5;
          return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        node.attr("transform",d=>`translate(${d.x},${d.y})`);

      });

      function dragstarted(event,d){
        if(!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event,d){
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event,d){
        if(!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

    }

  });

}