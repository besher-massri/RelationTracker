'use strict';
function InterfaceActionsHandler() {

  this.showFirstEntitySummaryTab = function (status) {
    d3.select("#first-node-summary-tab").classed("active", status);
    d3.select("#node-tracker-tab").classed("active", !status);
    d3.select("#first-node-summary-content").style("display", "none").classed("active", status);
    d3.select("#node-tracker-content").style("display", !status ? "inline-block" : "none").classed("active", !status);
  };
  this.showSecondEntitySummaryTab = function (status) {
    d3.select("#first-node-summary-tab").classed("active", !status);
    d3.select("#second-node-summary-tab").style("display", status ? "inline-block" : "none").classed("active", status);
    d3.select("#node-tracker-tab").classed("active", false);
    d3.select("#first-node-summary-content").style("display", !status ? "inline-block" : "none").classed("active", !status);
    d3.select("#second-node-summary-content").style("display", status ? "inline-block" : "none").classed("active", status);
    d3.select("#node-tracker-content").style("display", "none").classed("active", false);
  };
  this.showPairRelationTabs = function (status) {
    d3.select("#first-node-summary-tab").classed("active", !status);
    d3.select("#second-node-summary-tab").style("display", status ? "inline-block" : "none").classed("active", false);
    d3.select("#node-tracker-tab").classed("active", false);
    d3.select("#pair-relationship-summary-tab").style("display", status ? "inline-block" : "none").classed("active", status);
    d3.select("#first-node-summary-content").style("display", !status ? "inline-block" : "none").classed("active", !status);
    d3.select("#second-node-summary-content").style("display", "none").classed("active", false);
    d3.select("#node-tracker-content").style("display", "none").classed("active", false);
    d3.select("#pair-relationship-summary-content").style("display", status ? "inline-block" : "none").classed("active", status);
  };
  this.clearSummary = function (tabNumber) {
    d3.select("#" + tabNumber + "info").style("display", "none");
    d3.select("#" + tabNumber + "-title-span").html("");
    d3.select("#" + tabNumber + "-type-span").html("");
    d3.select("#" + tabNumber + "-uri-span").select("a").remove();
    d3.select("#" + tabNumber + "-num-events-span").html("");
    d3.select("#" + tabNumber + "-num-articles-span").html("");
    d3.select("#" + tabNumber + "-top-events-div").html("");
    d3.select("#" + tabNumber + "-add-to-track-button").style("display", "none");
  };
  this.initToolBoxes = function () {
    d3.select("#cluster-input").property("value", "");
    d3.select("#tags-div").selectAll("a").remove();
    document.getElementById("single-mode-radiobutton").checked = true;
    document.getElementById("monthly-scale-radiobutton").checked = true;
    d3.select("#pair-nodes-selection-div").style("display", "inline-block");
    d3.select("#slider-div").style("display", "inline-block");
    d3.select("#cloud-div").style("display", "inline-block");
  };
  function fillEventsTitle(listOfTitles, tabNumber) {
    d3.selectAll("." + tabNumber + "-events-titles").remove();

    listOfTitles.sort(function (a, b) {
      return b.score - a.score;
    });
    let titlesDiv = d3.select("#" + tabNumber + "-top-events-div");
    titlesDiv.html("");
    listOfTitles.forEach(function (cur, idx) {
      titlesDiv.append("text")
        .attr("class", tabNumber + "-events-titles")
        .text(cur.title)
        //.style("color", "white")
        .style("background-color", idx % 2 === 1 ? "#AE9F8B" : "#B4B4C8")
        .style("opacity", 1);
      //.style("font-weight","bold");
      titlesDiv.html(titlesDiv.html() + "<br /><br />");
    });
  }
  this.fillEntitySummary = function (tabNumber, info) {
    d3.select("#" + tabNumber + "info").style("display", "inline-block");
    d3.select("#" + tabNumber + "-title-span").html(info.title);
    d3.select("#" + tabNumber + "-type-span").html(info.type);
    d3.select("#" + tabNumber + "-uri-span").select("a").remove();
    d3.select("#" + tabNumber + "-uri-span").append("a")
      .attr("href", info.uri)
      .append("text")
      .text(info.uri);
    d3.select("#" + tabNumber + "-add-to-track-button").attr("idtosubmit", info.id).style("display", "inline-block");
    d3.select("#" + tabNumber + "-num-events-span").html(info.totalEvents);

    d3.select("#" + tabNumber + "-num-articles-span").html(info.totalArticles);
    fillEventsTitle(info.topEvents, tabNumber);
    let currentContent, otherContent;
    if (tabNumber === "tab1") {
      currentContent = "first";
      otherContent = "second";
    } else {
      currentContent = "second";
      otherContent = "first";
    }
    d3.select("#" + currentContent + "-node-summary-content").style("display", "inline-block").classed("active", true);
    d3.select("#" + otherContent + "-node-summary-content").style("display", "none").classed("active", false);
    d3.select("#node-tracker-content").style("display", "none").classed("active", false);
  };
  this.fillPairRelationSummary = function (info) {
    d3.select("#title1-span").text(info.first.title);
    d3.select("#title2-span").text(info.second.title);
    d3.select("#type1-span").text(info.first.type);
    d3.select("#type2-span").text(info.first.type);
    d3.select("#top-shared-non-entity-concepts").style("display", "none");

    d3.select("#tags-div").selectAll("a").remove();
    d3.select("#n-shared-events").classed("label-info", true)
      .text(info.totalSharedEvents);
    d3.select("#pair-num-articles-span").html(info.totalSharedArticles);
    d3.select("#top-shared-non-entity-concepts").style("display", "inline-block");

    let tags = d3.select("#tags-div")
      .selectAll("a")
      .data(info.tags);
    tags.exit().remove();
    tags.enter()
      .append("a")
      .attr("id", "tags-elements")
      .attr("href", d => d.link)
      .style("display", "inline-block")
      .classed("well", true)
      .attr("font-size", "11px")
      .append("text")
      .text(d => d.title);
    fillEventsTitle(info.topSharedEvents, "pair");
  };
  this.initSvgCanvas = function (globalNodeThreshold, globalEdgeThreshold) {
    d3.select("#canvas-div").classed("svg-container", true);
    d3.select("#slider-operations-toolbox-div").style("opacity", 1);
    d3.select("#node-operations-toolbox-div").style("opacity", 1);
    d3.select("#canvas-div").style("display", "inline-block");
    d3.select("#info-div").style("display", "inline-block");
    d3.select("#stream-div").style("display", "inline-block");
    d3.select("#node-threshold-input").property("value", globalNodeThreshold);
    d3.select("#edge-threshold-input").property("value", globalEdgeThreshold);
  };
  this.initTopic = function (topicName) {
    d3.select("#cluster-name").text(topicName);
    d3.select("#track-only-checkbox").property("checked", false);
    d3.select("#fixed-nodes-div")
      .selectAll("button")
      .remove();
  };
  this.addLinkedTag = function(title, callbackFn, callbackArgs) {
    d3.select("#fixed-nodes-div")
      .append("button")
      .attr("id", "tags-elements")
      .style("display", "inline-block")
      .classed("well", true)
      .attr("font-size", "11px")
      .text(title)
      .on("click",
        function() {
          callbackFn(callbackArgs);
          d3.select(this).remove();
        });
  };
}

