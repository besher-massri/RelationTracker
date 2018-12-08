'use strict';
function NetworkGraph() {
  
  //configurable parameters
  let dimensions = { width: 300, height: 500 },
    chartMargin = 0;
  //there is also nodesScale.color, specified as part of the nodeScale object

  // programs internal variables
  //constant parameters
  //force layout parameters
  let nodesForce = 2000,
    radiusOfGraphCircle = 200,//radial force towards the center of a circle at that radius
    ticksThreshold = 30;//max number of times the simulation will run at a time
  //links parameters

  let linksLabelsOpacity = 0.5;//fixed
  let linksLabelsOrigColor = "#ff0000";
  let linksLabelFocusedColor = "#ff0000";
  let linksLinesOrigColor = "#76963e";
  let linksLinesFocusedColor = "#ff0000";
  let linksLinesOrigOpacity = 0.2;
  let linksLinesFocusedOpacity = 0.5;

  //nodes parameters
  let nodesCircleOrigOpacity = 0.2,
    nodesCircleFocusedOpacity = 0.5,
    nodesCircleRadiusRange = [10, 25],
    nodesLabelSizeRange = [10, 20],
    selectedNodeCircleColor = "#FF4500",
    nodesScale = { circles: undefined, labels: undefined, circleColor: d3.scaleOrdinal(d3.schemeCategory20) };
  //data parameters
  let events = {};
  //contain the dom objects, data, and their binding function
  let binding = { o: undefined, d: [], f: function (d, i) { return d && d.id ? d.id : i; } };
  // simulation stabilizing variables
  let tickCount = 0,
    simulation,
    statusOfAction,
    positions = {};

  //selected nodes
  let selectedNode = undefined,
    secondSelectedNode = undefined,
    selectedLink = undefined;
  //shortcut variables for fast access
  let graphNodesGroup,
    graphLinksGroup;
  // temp variables to help faster some operations
  let nodeSelectionStatus,
    tempFilteredNodes,//stores the ids
    tempFilteredEdges;// stores the ids


  d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  //initialize functions
  //private
  function initMargins() {
    dimensions.width -= 2 * chartMargin;
    dimensions.height -= 2 * chartMargin;
    binding.o.attr("transform", "translate(" + [chartMargin, chartMargin] + ")");
  }
  function initBackground() {
    binding.o
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("rect")
      .attr("id", "background-rect")
      //.attr("class", "well")
      .attr("x", 0.5)
      .attr("y", 0.5)
      .attr("width", dimensions.width - 1)
      .attr("height", dimensions.height - 1)
      .attr("fill", "transparent")
      .on("click", () => backgroundZoomingReset())
      .call(d3.zoom().on("zoom", () => backgroundZoomed()));
  }
  function initializeEvents() {
    events = {};
    let dummyFunction = function () { return function () { } };
    events.nodeSelected = dummyFunction();
    events.nodeUnSelected = dummyFunction();
    events.nodeOver = dummyFunction();
    events.nodeOut = dummyFunction();
    events.pairSelected = dummyFunction();
    events.pairUnSelected = dummyFunction();
    events.nodeRightClicked = dummyFunction();
  }
  function initSimulation() {
    simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force("link", d3.forceLink()
        .distance(function () {
          return 200;
        })
        .id(d => d.id))
      .force('collision', d3.forceCollide().radius(function (d) {
        return getRadius(d.value);
      }))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("charge", d3.forceManyBody().strength(function () {
        return -nodesForce;
      }))
      .force('y', d3.forceY().y(function () {
        return dimensions.height / 2;
      }))
      .force("r", d3.forceRadial(radiusOfGraphCircle).x(dimensions.width / 2).y(dimensions.height / 2))
      .stop();
  }
  //nodes-related functions
  function getRadius(d) {
    return nodesScale.circles(d.value);
  }
  function getNodeLabelOffset(d) {
    return -1.5 * getLabelFontSize(d);
  }
  function getLabelFontSize(d) {
    return nodesScale.labels(d.value);
  }
  function getColor(d) {
    return nodesScale.circleColor(d.type);
  }

  //events handlers
  //background-related functions
  function backgroundZoomingReset() {
    binding.o
      .attr("transform", "scale(1) translate(0,0)");
  }
  function backgroundZoomed() {
    binding.o
      .attr("transform",
        "translate(" + [d3.event.transform.x, d3.event.transform.y] + ") "
        + "scale(" + d3.event.transform.k + ")");
  }

  function stabilizeSimulation() {
    binding.d.nodes.forEach(function (d) {
      d.x = d.fx;
      d.y = d.fy;
      d.fx = undefined;
      d.fy = undefined;
    });
    simulation.restart().alpha(0.4);
  }
  function fixingGraph() {
    positions = {};
    binding.d.nodes.forEach(function (d) {
      positions[d.id] = [d.x, d.y];
      d.stay = true;
      d.fx = d.x;
      d.fy = d.y;
    });
    showGraph();
    if (statusOfAction !== "pending") {
      statusOfAction = "pending";
      stabilizeSimulation();
    } else {
      //  statusOfAction = "finished";
      //TODO check if we need to make it finished
    }
  }
  function showGraph() {
    d3.selectAll("g.singleNodeGroup").each(function () {
      if ((selectedNode !== undefined && this === selectedNode.svg) ||
        (secondSelectedNode !== undefined && this === secondSelectedNode.svg))
        return;
      let group = d3.select(this);
      group.select("text").transition().attr("font-size", function () { return d3.select(this).attr("orgSize"); }).attr("opacity", 1);
      group.select("circle").transition().attr("r", function () { return d3.select(this).attr("orgSize"); });
    });

    d3.selectAll(".singleLinkLine").transition().attr("stroke-opacity", linksLinesOrigOpacity);
    d3.selectAll(".singleLinkLabel").transition().attr("opacity", linksLabelsOpacity);
  }
  function nodeDragStarted(d, simulation) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    statusOfAction = "dragging";
    d.fx = d.x;
    d.fy = d.y;
  }
  function nodeDragged(d) {

    d.x = d.fx = d3.event.x;
    d.y = d.fy = d3.event.y;
  }
  function nodeDragEnded(d, simulation) {
    if (!d3.event.active) simulation.alphaTarget(0);
    // d.fx = undefined;
    //   d.fy = undefined;
    statusOfAction = "pending";
  }
  function simulationEnded() {

  }

  function nodeUnselected(circle) {
    if (nodeSelectionStatus === "single") {
      graphNodesGroup.selectAll("g.singleNodeGroup").style("display", "unset");
      graphLinksGroup.selectAll("g.singleLinkGroup").style("display", "unset");
      nodeSelectionStatus = "none";
    } else if (nodeSelectionStatus === "pair") {
      nodeSelectionStatus = "single";
    }
    circle = d3.select(circle).select("circle");
    circle.attr("fill", circle.attr("org-color"));
  }
  function nodeSelected(circle) {
    if (nodeSelectionStatus === "single") {//then this is the second one
      /*graphNodesGroup.selectAll("g.singleNodeGroup").style("display", function (d) {
          if (d.id == circle.id)
              return "init";
          return "none";
      });
      graphLinksGroup.selectAll("g.singleLinkGroup").style("display", function (d) {
          if (tempFilteredEdges.hasOwnProperty(d.id))
              return "init";
          return "none";
      });*/
      nodeSelectionStatus = "pair";
    } else if (nodeSelectionStatus === "none") {
      nodeSelectionStatus = "single";
      graphNodesGroup.selectAll("g.singleNodeGroup").style("display", function (d) {
        if (tempFilteredNodes.hasOwnProperty(d.id) || "node_" + d.id === circle.id)
          return "unset";
        return "none";
      });
      graphLinksGroup.selectAll("g.singleLinkGroup").style("display", function (d) {
        if (tempFilteredEdges.hasOwnProperty(d.id))
          return "unset";
        return "none";
      });
    }
    circle = d3.select(circle).select("circle");
    circle.attr("org-color", circle.attr("fill")).attr("fill", selectedNodeCircleColor);
  }
  function nodeClicked(element, circle) {
    // check for unSelection/fading
    //second is unselected
    if (secondSelectedNode !== undefined && secondSelectedNode.svg === circle) {
      events.pairUnSelected(selectedLink, selectedNode.data, secondSelectedNode.data);
      nodeUnselected(secondSelectedNode.svg);
      secondSelectedNode = undefined;
      selectedLink = undefined;

    } else if (selectedNode !== undefined && selectedNode.svg === circle) {
      //remove the second first, if exists
      if (secondSelectedNode != undefined) {
        events.pairUnSelected(selectedLink, selectedNode.data, secondSelectedNode.data);
        nodeUnselected(secondSelectedNode.svg);
        selectedLink = undefined;
        secondSelectedNode = undefined;
      }
      //then remove the first
      nodeUnselected(selectedNode.svg);
      events.nodeUnSelected(selectedNode.data);
      selectedNode = undefined;

    } else { // selection/shining
      if (selectedNode === undefined) {
        selectedNode = { svg: circle, data: element };
        nodeSelected(circle);
        events.nodeSelected(element);
      } else {
        // either both are occupied or the second is empty
        // in both cases we need to show information here
        if (secondSelectedNode !== undefined) {
          events.pairUnSelected(selectedLink, selectedNode.data, secondSelectedNode.data);
          nodeUnselected(secondSelectedNode.svg);
          selectedLink = undefined;
        }
        // should be put here
        nodeSelected(circle);
        secondSelectedNode = { svg: circle, data: element };
        let id1 = selectedNode.data.id, id2 = secondSelectedNode.data.id;
        if (id1 > id2) {
          let tempId = id1;
          id1 = id2;
          id2 = tempId;
        }
        let curEdge = d3.select("#link_" + id1 + "_" + id2).node().__data__;
        selectedLink = curEdge;
        events.pairSelected(selectedLink, selectedNode.data, secondSelectedNode.data);
      }
    }
  }
  function nodeOver(node, d) {
    node = d3.select(node);
    node.moveToFront();
    if ((selectedNode !== undefined && node.node() === selectedNode.svg) ||
      (secondSelectedNode !== undefined && node.node() === secondSelectedNode.svg))
      return;
    if (nodeSelectionStatus === "none") {
      tempFilteredNodes = {};
      tempFilteredEdges = {};
      binding.d.links.forEach(function (cur) {
        if (cur.source.id === d.id) {
          tempFilteredNodes[cur.target.id] = 1;
          tempFilteredEdges[cur.id] = 1;
          return true;
        }
        if (cur.target.id === d.id) {
          tempFilteredNodes[cur.source.id] = 1;
          tempFilteredEdges[cur.id] = 1;
          return true;
        }
        return false;
      });
      Object.keys(tempFilteredNodes).forEach(function (cur) {
        d3.select("#node_" + cur).select("circle").transition().attr("stroke-width", 10).attr("opacity", nodesCircleFocusedOpacity);
      });

      //links
      Object.keys(tempFilteredEdges).forEach(function (cur) {
        d3.select("#link_" + cur).select("line").transition().attr("stroke", linksLinesFocusedColor).attr("stroke-opacity", linksLinesFocusedOpacity);
        d3.select("#link_" + cur).select("text").transition().attr("stroke", linksLabelFocusedColor)
          .attr("fill", linksLabelFocusedColor).attr("stroke-width", "1px");
      });
    }
    let circle = node.select("circle");
    let text = node.select("text");

    circle.transition().attr("r", +circle.attr("orgSize") + 10).attr("stroke-width", 10).attr("opacity", nodesCircleFocusedOpacity);
    text.transition().attr("font-size", +(text.attr("orgSize")) + 10);

    if (selectedNode === undefined) {
      events.nodeOver(d, "first");
    } else if (secondSelectedNode === undefined) {
      events.nodeOver(d, "second");
    } else {
      events.nodeOver(d, "third");
    }

  }
  function nodeOut(node, d) {
    node = d3.select(node);
    if ((selectedNode !== undefined && node.node() == selectedNode.svg) ||
      (secondSelectedNode !== undefined && node.node() == secondSelectedNode.svg))
      return;
    let circle = node.select("circle");
    let text = node.select("text");
    if (nodeSelectionStatus === "none") {
      Object.keys(tempFilteredNodes).forEach(function (cur) {
        d3.select("#node_" + cur).select("circle").transition().attr("stroke-width", 0).attr("opacity", nodesCircleOrigOpacity);
      });
      Object.keys(tempFilteredEdges).forEach(function (cur) {
        d3.select("#link_" + cur).select("line").transition().attr("stroke", linksLinesOrigColor).attr("stroke-opacity", linksLinesOrigOpacity);
        d3.select("#link_" + cur).select("text").transition().attr("stroke", linksLabelsOrigColor)
          .attr("fill", linksLabelsOrigColor).attr("stroke-width", "0px");

      });
      tempFilteredNodes = {};
      tempFilteredEdges = {};
    }
    circle.transition().attr("r", circle.attr("orgSize")).attr("stroke-width", 0).attr("opacity", nodesCircleOrigOpacity);

    text.transition().attr("font-size", +text.attr("orgSize"));

    if (selectedNode === undefined) {
      events.nodeOut(d, "first");
    } else if (secondSelectedNode === undefined) {
      events.nodeOut(d, "second");
    } else {
      events.nodeOut(d, "third");
    }

  }
  function nodeRightClicked(node, d) {
    if (selectedNode === undefined) {
      events.nodeRightClicked(d, "first");
    } else if (secondSelectedNode === undefined) {
      events.nodeRightClicked(d, "second");
    } else {
      events.nodeRightClicked(d, "third");
    }
  }

  // public
  function chart(selection) {

    binding.o = selection.append("svg");
    initBackground();
    binding.o = binding.o
      .append("g")
      .attr("id", "svgGroup");
    initMargins();


    chart.reset();

  }
  chart.clearSelection = function () {
    if (selectedNode !== undefined) {
      if (secondSelectedNode !== undefined) {
        events.pairUnSelected(selectedLink, selectedNode.data, secondSelectedNode.data);
        nodeUnselected(secondSelectedNode.svg);
        secondSelectedNode = undefined;
        selectedLink = undefined;
      }
      nodeUnselected(selectedNode.svg);
      events.nodeUnSelected(selectedNode.d);
      selectedNode = undefined;
    }

    tempFilteredEdges = {};
    tempFilteredNodes = {};
  };
  chart.reset = function () {
    // clear the old data and elements
    binding.d = { "nodes": [], "links": [] };
    chart.clearSelection();
    tickCount = 0;
    initSimulation();
    positions = {};
    statusOfAction = "init";
    nodeSelectionStatus = "none";

    //selected nodes
    selectedNode = undefined;
    secondSelectedNode = undefined;

    // temp variables 
    tempFilteredNodes = undefined;
    tempFilteredEdges = undefined;
    //resetting links and nodes groups
    binding.o.select("#linksGroup").remove();
    binding.o.select("#nodesGroup").remove();
    graphLinksGroup = binding.o
      .append("g")
      .attr("id", "linksGroup")
      .attr("class", "links");

    graphNodesGroup = binding.o
      .append("g")
      .attr("id", "nodesGroup")
      .attr("class", "nodes");
  };

  function update() {
    //updating all the nodes to their original color

    tickCount = 0;

    simulation.stop();

    let nodes = binding.d.nodes;
    let links = binding.d.links;


    let drag =
      d3.drag()
        .on("start", d => nodeDragStarted(d, simulation))
        .on("drag", d => nodeDragged(d))
        .on("end", d => nodeDragEnded(d, simulation));

    // nodes
    let graphNodesData =
      graphNodesGroup
        .selectAll("g.singleNodeGroup")
        .data(nodes, binding.f);


    //exit node
    let graphNodesExit =
      graphNodesData
        .exit();


    graphNodesExit.selectAll("text").text("");

    graphNodesExit.select("circle")
      .attr("orgSize", 0)
      .transition("hide")
      .duration(1000)
      .attr("r", 0)
      .on("end", function () {
        graphNodesExit.remove();
      });
    
    /*
    graphNodesData
        .select("circle")
        .transition()
        .duration(1000)
        .attr("fill", function (d) {
            return "green";
        });
    */
    let graphNodesEnter =
      graphNodesData
        .enter().append("g")
        .classed("singleNodeGroup", true)
        .attr("id", d => "node_" + d.id)
        .call(drag);

    graphNodesEnter
      .append("circle")
      .classed("singleNodeCircle", true)
      .attr("r", 0)
      .attr("fill", d => getColor(d))
      .attr("orgSize", d => getRadius(d))
      .attr("opacity", nodesCircleOrigOpacity)
      .attr("stroke", "yellow")
      .attr("stroke-width", 0)
      .attr("stroke-opacity", nodesCircleOrigOpacity)
      .attr("cursor", "pointer")
      .on("contextmenu",
        function (d) {
          nodeRightClicked(this.parentNode, d);
          d3.event.preventDefault();
        })
      .on("mouseover",
        function (d) {
          if (statusOfAction === "dragging") return;
          nodeOver(this.parentNode, d);
        })
      .on("mouseout",
        function (d) {
          if (statusOfAction === "dragging") return;
          nodeOut(this.parentNode, d);
        })
      .on("click",
        function (d) {
          nodeClicked(d, this.parentNode);
        }).moveToFront();

    let graphNodeLabels =
      graphNodesEnter
        .append("text")
        .classed("singleNodeLabel", true)
        .attr("y", d => getNodeLabelOffset(d))
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        //    .style("font-family", "monospace")
        .attr("font-size", 0)
        .attr("orgSize",
          d => getLabelFontSize(d))
        .text(d => d.title);

    graphNodesData =
      graphNodesEnter.merge(graphNodesData);

    graphNodesData
      .select("circle")
      .attr("orgSize", d => getRadius(d));

    //LABELS
    graphNodesData
      .select("text")
      .attr("orgSize", d => getLabelFontSize(d));

    simulation
      .nodes(nodes)
      .on("tick",
        function (d) {
          if (statusOfAction === "dragging" || tickCount < ticksThreshold)
            handleTicked(), tickCount++;
          else
            simulation.stop(), tickCount = 0, fixingGraph();
        })
      .on("end", () => simulationEnded());

    //==================================LINKS===============================================//

    let graphLinksData =
      graphLinksGroup
        .selectAll("g.singleLinkGroup")
        .data(links, binding.f);

    //exit
    graphLinksData
      .exit()
      .select("line")
      .transition()
      .attr("stroke-opacity", 0)
      .on("end",
        function () {
          d3.select(this.parentNode).remove();
        });
    //.remove();

    //enter
    let graphLinksEnter =
      graphLinksData
        .enter()
        .append("g")
        .classed("singleLinkGroup", true)
        .attr("id",
          function (d) {
            return "link_" + d.id;
          });


    graphLinksEnter
      .append("line")
      .classed("singleLinkLine", true)
      .attr("stroke-width",
        function (d) {
          return Math.pow(d.value, 0.3);
        })
      .attr("stroke", linksLinesOrigColor)
      .attr("stroke-opacity", 0);


    graphLinksEnter
      .append("text")
      .classed("singleLinkLabel", true)
      .text(function (d) { return d.label; })
      .attr("stroke", linksLabelsOrigColor)
      .attr("fill", linksLabelsOrigColor)
      .attr("stroke-width", "0px")
      .attr("opacity", 0);

    /////// merge
    graphLinksData =
      graphLinksEnter.merge(graphLinksData);

    graphLinksData
      .select("line")
      .transition()
      .attr("stroke-width",
        function (d) {
          return Math.sqrt(d.value);
        });

    graphLinksData
      .select("text")
      .each(function (d) {
        let cur = d3.select(this);
        if (cur.text() != d.label)
          cur.transition().attr("opacity", 0).on("end", function () { cur.text(d.label); });

      });
    simulation
      .force("link")
      .links(links);
    simulation.restart();
    simulation.alpha(1);

    function handleTicked() {
      function processX(radius, x) {
        return Math.max(radius, Math.min(dimensions.width - radius, x));
      }

      function processY(radius, y) {
        //   return y;
        return Math.max(radius, Math.min(dimensions.height - radius, y));
      }

      // Translate the groups
      graphNodesData
        /*.transition().duration(500)*/.attr("transform",
        function (d, i) {
          let radius = getRadius(d);
          let textEl = d3.select(graphNodesData._groups[0][i]).select("text");
          var textSize = (textEl.attr("orgSize")) * textEl.text().length / 2.0;
          let move = false;
          d.x = processX(Math.max(textSize * 2.0 / 3, radius), d.x + (move ? Math.random() * 50 - 25 : 0));
          d.y = processY(radius * 3, d.y + (move ? Math.random() * 50 - 25 : 0));
          return "translate(" + [d.x, d.y] + ")";
        });
      graphLinksData
        /*.transition().duration(500)*/
        .select("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      graphLinksData
        .select("text")
        .attr("x", d => (d.source.x + d.target.x) / 2 - d.label.length / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);
    }
  }

  //network graph interface

  //draw graph as a new one
  chart.drawGraph = function (processedGraph) {
    chart.reset();
    chart.updateGraph(processedGraph);
  };
  //update the graph, handle the changes in node dynamically
  chart.updateGraph = function (processedGraph) {
    chart.clearSelection();
    simulation.stop();
    //to add all the current nodes to the positions array
    if (processedGraph.nodes.length > 0)
      fixingGraph();
    //customizing the values of the nodes based on the maximum size
    let maxValue = -100000000, minValue = 1000000000;
    Object.keys(processedGraph.nodes).forEach(function (key) {
      maxValue = Math.max(maxValue, processedGraph.nodes[key].value);
      minValue = Math.min(minValue, processedGraph.nodes[key].value);
    });
    nodesScale.circles = d3.scalePow()
      .exponent(0.7)
      .range(nodesCircleRadiusRange)
      .domain([minValue, maxValue]);
    nodesScale.labels = d3.scaleLinear()
      .range(nodesLabelSizeRange)
      .domain([minValue, maxValue]);


    binding.d.nodes = processedGraph.nodes;
    binding.d.links = processedGraph.links;

    let nodes = binding.d.nodes;
    nodes.forEach(function (cur, idx) {
      if (positions.hasOwnProperty(cur.id)) {
        nodes[idx].fx = nodes[idx].x = positions[cur.id][0];
        nodes[idx].fy = nodes[idx].y = positions[cur.id][1];
        nodes[idx].vx = nodes[idx].vy = 0;
        nodes[idx].stay = true;
      }
    });
    statusOfAction = "update";
    update();
  };
  //main configurations
  chart.width = function (value) {
    return arguments.length ? (dimensions.width = value, chart) : dimensions.width;
  };
  chart.height = function (value) {
    return arguments.length ? (dimensions.height = value, chart) : dimensions.height;
  };
  chart.colorScale = function (scale) {
    return arguments.length ? (nodesScale.circleColor = scale, chart) : nodesScale.circleColor;
  };
  chart.bindingFunction = function (func) {
    return arguments.length ? (binding.f = func, chart) : binding.f;
  };
  chart.on = function (action, callback) {
    switch (action) {
      case "nodeSelected":// when a first node selected -> callback(selectedNode)
        return arguments.length > 1 ? (events.nodeSelected = callback, chart) : events.nodeSelected;

      case "nodeUnselected": //when a first node unselected -> callback(selectedNode)
        return arguments.length > 1 ? (events.nodeUnSelected = callback, chart) : events.nodeUnSelected;

      case "nodeOver":// when a mouse over any node -> callback(touchedNode,"first"|"second"|"third")
        //only activated on non-selected nodes
        return arguments.length > 1 ? (events.nodeOver = callback, chart) : events.nodeOver;

      case "nodeOut":// when a mouse out of any node -> callback(touchedNode,"first"|"second"|"third")
        //only activated on non-selected nodes
        return arguments.length > 1 ? (events.nodeOut = callback, chart) : events.nodeOut;

      case "pairSelected"://when a second node selected -> callback(sharedLink,firstSelectedNode,SecondSelectedNode)
        return arguments.length > 1 ? (events.pairSelected = callback, chart) : events.pairSelected;

      case "pairUnSelected":// when a second node unselected -> callback(shared edge,firstSelectedNode,SecondSelectedNode)
        return arguments.length > 1 ? (events.pairUnSelected = callback, chart) : events.pairUnSelected;

      case "nodeRightClicked": //when any node rightClicked -> callback(clickedNode,"first"|"second"|"third")
        return arguments.length > 1 ? (events.nodeRightClicked = callback, chart) : events.nodeRightClicked;
    }
    return chart;
  };

  //this is the body of the main function
  initializeEvents();
  return chart;
}