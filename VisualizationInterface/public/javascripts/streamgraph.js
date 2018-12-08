'use strict';
function drawStreamGraph(data, listOfWords, divId) {
  let chartDiv = d3.select("#" + divId);
  let legend = {};
  let timeParser = d3.timeParse("%Y-%m-%d");
  for (let i = 0; i < data.length; ++i) {
    for (let j = 0; j < listOfWords.length; ++j)
      if (!data[i].hasOwnProperty(listOfWords[j]))
        data[i][listOfWords[j]] = 0;
    data[i].time = timeParser(data[i].time);
  }

  let stack = d3.stack()
    .keys(listOfWords)
    .order(d3.stackOrderInsideOut)
    .offset(d3.stackOffsetSilhouette);//d3.stackOffsetWiggle vs d3.stackOffsetSilhouette
  let layers = stack(data);

  //delete the px at the end of the size attributes, for conversion compatibility
  function deletePx(str) {
    return +str.slice(0, str.length - 2);
  }
  let width = deletePx(chartDiv.style("width")),
    height = deletePx(chartDiv.style("height")) - 60,
    padding = 40;
  //set up scales
  let x = d3.scaleTime()
    .domain(d3.extent(data, function (d) { return d.time; }))
    .range([padding, width - padding]);

  let minPoint = d3.min(layers, function (layer) { return d3.min(layer, function (d) { return d[0]; }); });
  let maxPoint = d3.max(layers, function (layer) { return d3.max(layer, function (d) { return d[1]; }); });
  let y = d3.scaleLinear()
    .domain([minPoint, maxPoint])
    .range([height - padding, padding]);
  let color = d3.scaleOrdinal(d3.schemeCategory20);
  let area = d3.area()
    .x(function (d) { return x(d.data.time); })
    .y0(function (d) { return y(d[0]); })
    .y1(function (d) { return y(d[1]); })
    .curve(d3.curveBasis);

  chartDiv.selectAll("svg").remove();

  let svg = chartDiv
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  chartDiv.selectAll("div").remove();

  let tooltip = chartDiv
    .append("div")
    .style("position", "absolute")
    .style("background-color", "black")
    .style("color", "white")
    .style("visibility", "hidden")
    .style("text-align", "center")
    .style("border-radius", "6px")
    .style("padding", "6px")
    .style("pointer-events", "none");

  let streamGraph = svg.append("g");

  let line = streamGraph.append("line")
    .attr("stroke", "black")
    .attr("opacity", 0.3)
    .attr("stroke-width", "1px")
    .style("pointer-events", "none");
  d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  streamGraph.on("mousemove", function () {
    line
      .attr("x1", d3.event.pageX)
      .attr("x2", d3.event.pageX)
      .attr("y1", padding)
      .attr("y2", height - padding)
      .moveToFront();
  });

  streamGraph.on("mouseout", function () {
    tooltip.style("visibility", "hidden");
  });

  streamGraph
    .selectAll("path")
    .data(layers)
    .enter()
    .append("path")
    .attr("d", area)
    .on("mouseover", function () {
      highlightArea(d3.select(this));
    })
    .on("mouseout", function () {
      fadeArea(d3.select(this));
    })
    .on("mousemove", function (d) {
      let mouseTime = x.invert(d3.event.pageX);
      let bestIdxSoFar = -1, bestDisSoFar = -1;
      for (let i = 0; i < d.length; ++i) {
        if (bestIdxSoFar === -1 || bestDisSoFar > Math.abs(d[i].data.time - mouseTime))
          bestIdxSoFar = i, bestDisSoFar = Math.abs(d[i].data.time - mouseTime);
      }
      let format = d3.timeFormat("%Y-%m-%d");
      let freq = d[bestIdxSoFar][1] - d[bestIdxSoFar][0];
      if (freq === 0 /*&& d[bestIdxSoFar].data.time != mouseTime*/) {
        //bestDisSoFar = bestDisSoFar > 0 ? bestDisSoFar - 1 : bestDisSoFar + 1;
        let idxDistance = 1;
        while (idxDistance < d.length) {
          let temp1 = bestIdxSoFar + idxDistance;
          if (temp1 < d.length && d[temp1][1] - d[temp1][0] > 0) {
            bestIdxSoFar = temp1;
            freq = (d[bestIdxSoFar][1] - d[bestIdxSoFar][0]) / (idxDistance + 1);
            break;
          }
          temp1 = bestIdxSoFar - idxDistance;
          if (temp1 < d.length && d[temp1][1] - d[temp1][0] > 0) {
            bestIdxSoFar = temp1;
            freq = (d[bestIdxSoFar][1] - d[bestIdxSoFar][0]) / (idxDistance + 1);
            break;
          }
          ++idxDistance;
        }
        //freq = d[bestIdxSoFar][1] - d[bestIdxSoFar][0];
      }
      tooltip.html("<p>" + d.key /*+ "<br>" + Math.round(freq)*/ + "<br/>" + format(mouseTime) + "</p>")
        .style("left", (d3.event.pageX + 10) + "px")
        .style("top", (d3.event.pageY + 5) + "px")
        .style("visibility", "visible");
    })
    .attr("fill", function (d) {
      let randomColor = color(Math.random() * 10);
      legend[d.key] = { "color": randomColor, "area": this };
      return randomColor;
    })
    .attr("stroke", function () {
      return d3.rgb(d3.select(this).attr("fill")).darker();
    })
    .attr("stroke-width", "4px")
    .attr("stroke-opacity", 0);
  //   streamGraph.attr("transform", "translate(" + [0, HeightCounter] + ")");
  // setup axis
  let xAxis = d3.axisBottom(x).ticks(d3.timeMonth.every(1));//.tickPadding(10).ticks(10, d3.timeFormat("%Y-%m-%d"));
  xAxis.ticks();
  let yAxisL = d3.axisLeft(y).tickValues([]);
  let yAxisR = d3.axisRight(y).tickValues([]);
  streamGraph.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + (height - padding) + ")")
    .call(xAxis);

  let addYAxis = true;
  if (addYAxis) {

    streamGraph.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(" + [padding, 0] + ")")
      .call(yAxisL);

    streamGraph.append("g")
      .attr("class", "axis axis--y")
      .attr("transform", "translate(" + [width - padding, 0] + ")")
      .call(yAxisR);
  }
  let legendgroup = svg.append("g")
    .attr("transform", "translate(" + [padding, height] + ")")
    .attr("class", "well")
    .attr("width", width)
    .attr("height", 50);

  legendgroup.style("display", "inline-block");
  let sideOfRec = 20;
  let legendPadding = 10;
  let widthCounter = 0;
  let heightCounter = 0;
  Object.keys(legend).forEach(function (key) {
    if (widthCounter + sideOfRec + legendPadding * 3 + key.length * 6
      >= width - padding) {
      widthCounter = 0; heightCounter += sideOfRec + legendPadding / 2;
    }
    legendgroup.append("rect")
      //.attr("y", idx * 35 )
      .attr("x", widthCounter)
      .attr("y", heightCounter)

      .attr("width", sideOfRec)
      .attr("height", sideOfRec)
      .attr("fill", legend[key].color)
      .on("mouseover", function () {
        highlightArea(d3.select(legend[key].area));
      })
      .on("mouseout", function () {
        fadeArea(d3.select(legend[key].area));
      });

    widthCounter += sideOfRec + legendPadding;

    legendgroup.append("text")
      .attr("y", sideOfRec / 2 + 7 + heightCounter)
      .attr("x", widthCounter)
      .attr("font-size", "12px")
      //  .style("font-family","monospace")
      .attr("padding", "0px 0px 0px 0px")
      .text(key);
    widthCounter += key.length * 7 + legendPadding * 2;

  });
  svg.attr("height", parseInt(svg.attr("height")) + heightCounter + 50);

  function highlightArea(area) {
    area.transition().attr("stroke-opacity", 1);
  }
  function fadeArea(area) {
    area.transition().attr("stroke-opacity", 0);
  }
}