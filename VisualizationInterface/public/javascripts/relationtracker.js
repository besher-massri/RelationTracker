'use strict';
function RelationTracker() {
  //configuration parameters
  let configPath = "data\\config.jsonl";
  let NTopics;
  let mainDataFolder="data\\";
  let characteristicsFileName;
  let clusterNamesFileName;
  let eventsFileName;
  let conceptsFileName;
  let nodesFileName;
  let datesFileName;
  let currentTopic;
  let eventRegistryApiKey;

  // parameters
  let nodeThreshold = 10, edgeThreshold = 1;
  //max number of top events in the info div
  let topEventsThreshold = 5;

  let wordsPerCloudThreshold = 500;

  let listOfEvents; // object contain the id -> events pairs
  let listOfConcepts;
  let listOfNodes;
  let listOfDates = [];
  let topicCloud;
  // initialize global variables
  let networkGraph = new NetworkGraph();
  let dataProcessor = new DataProcessor();
  let slider = new Slider();


  let tagCloud = new TagCloud();

  let interfaceActionsHandler = new InterfaceActionsHandler();


  let clusterInfo = {};
  //global helping function


  //first time only init functions
  function loadConfigurations(callback, callbackArgs) {
    d3.json(configPath,
      function (error, config) {
        if (error)
          console.log(error);
        
        NTopics = config.NTopics;
        characteristicsFileName = config.characteristicsFileName;
        eventsFileName = config.eventsFileName;
        conceptsFileName = config.conceptsFileName;
        nodesFileName = config.nodesFileName;
        datesFileName = config.datesFileName;
        clusterNamesFileName = config.clusterNamesFileName;
        eventRegistryApiKey = config.eventRegistryApiKey;
        if (callback !== undefined)
          callback(callbackArgs);
      });
  }
  function init() {
    initActionButtons();
    interfaceActionsHandler.initSvgCanvas(nodeThreshold, edgeThreshold);
    initCharts();
    dataProcessor.init(eventRegistryApiKey);
    processMeta();
  }

  function initCharts() {
    slider.onAction(intervalSelected);
    function deletePx(str) {
      return +str.slice(0, str.length - 2);
    }
    let graphDiv = d3.select("#canvas-div");
    networkGraph
      .width(deletePx(graphDiv.style("width")))
      .height(deletePx(graphDiv.style("height")))
      .colorScale(d3.scaleLinear().domain([0, 1]).range(["blue", "red"]))
      .bindingFunction(d => d.id)
      .on("nodeSelected", nodeSelected)
      .on("nodeOver", nodeOver)
      .on("nodeOut", nodeOut)
      .on("pairSelected", pairNodeSelected)
      .on("pairUnSelected", pairNodeUnselected)
      .on("nodeRightClicked", nodeRightClicked)
      (graphDiv);
    slider.init();
  }
  function initActionButtons() {
    d3.select("#clearSelection").on("click",
      function () {
        networkGraph.clearSelection();
      });
    d3.selectAll("input[name='scale']").on("change",
      function () {
        slider.updateSlider();
      });
    d3.select("#next-date-button").on("click",
      function () {
        let obj = d3.select("#sliding-value");
        let value = obj._groups[0][0].value;
        slider.moveSlider(parseInt(value));
      });
    d3.select("#prev-date-button").on("click",
      function () {
        let value = d3.select("#sliding-value").property("value");
        slider.moveSlider(-parseInt(value));
      });
    d3.selectAll("input[name='mode']").on("change",
      function () {
        if (this.value === "Interval")
          slider.beginInterval();
        else
          slider.cancelInterval();
      });
    d3.select("#magnify-button").on("click",
      function () {
        slider.magnify();
      });
    d3.select("#cancel-magnify-button").on("click",
      function () {
        slider.cancelMagnification();
      });
    d3.selectAll(".info-tabs").on("click",
      function () {
        let currentContent = d3.select(this).attr("id");
        currentContent = currentContent.slice(0, currentContent.length - 3) + "content";
        d3.selectAll(".info-content").style("display",
          function () {
            if (d3.select(this).attr("id") === currentContent)
              return "inline-block";
            return "none";
          });
      });
    d3.selectAll("#track-only-checkbox").on("change",
      function () {
        dataProcessor.updateFilter(d3.select(this).property("checked"));

      });
    d3.selectAll(".add-to-track-button").on("click",
      function () {
        let conceptId = d3.select(this).attr("idtosubmit");
        fixNode(conceptId);
      });
    d3.selectAll(".layout-tab").on("click",
      function () {
        let currentContent = d3.select(this).attr("id");
        currentContent = currentContent.slice(0, currentContent.length - 3) + "content";
        d3.selectAll(".layout-content").style("display",
          function () {
            if (d3.select(this).attr("id") === currentContent)
              return "inline-block";
            return "none";
          });
      });
    d3.select("#track-button").on("click",
      function () {
        dataProcessor.trackFilteredNodes(datesUpdated);
        d3.select("#cancel-track-button").style("display", "inline-block");
      });
    d3.select("#cancel-track-button").on("click",
      function () {
        dataProcessor.cancelTracking(datesUpdated);
        d3.select("#fixed-nodes-div")
          .selectAll("button")
          .remove();
        d3.select(this).style("display", "none");
      });
    d3.select("#update-entities-options-button").on("click",
      function () {
        slider.updateSlider();
      });
    d3.select("#node-threshold-input").on("change",
      function () {
        if (!document.getElementById("node-threshold-input").checkValidity()) return;
        nodeThreshold = d3.select(this).property("value");

      });
    d3.select("#edge-threshold-input").on("change",
      function () {
        if (!document.getElementById("edge-threshold-input").checkValidity()) return;
        edgeThreshold = d3.select(this).property("value");

      });
  }
  function processMeta() {
    let pathMeta = mainDataFolder + clusterNamesFileName + ".jsonl";
    d3.json(pathMeta,
      function (error, metadata) {
        if (error)
          console.log(error);
        for (let idxOfCluster = 0; idxOfCluster < NTopics; ++idxOfCluster) {
          let clusterKeywords = metadata["cluster" + idxOfCluster].keywords;
          if (clusterKeywords.length > 0) {
            let idxOfSelectedName = 0;
            while (idxOfSelectedName < clusterKeywords.length - 1 &&
              clusterInfo.hasOwnProperty(clusterKeywords[idxOfSelectedName].keyword))++idxOfSelectedName;
           
            let chosenName = clusterKeywords[idxOfSelectedName].keyword;
            clusterInfo[chosenName] = {
              "id": chosenName,
              "title": chosenName,
              "idx": idxOfCluster
            };
          } 
        }
        createSearchBar(document.getElementById("cluster-input"), Object.values(clusterInfo), clusterChosen);
      });
  }

  //wikipedia links are shorten before, so this function is used to return them to normal links
  function getWikiLink(str) {
    let parts = str.split('$');
    return "https://" + parts[0] + ".wikipedia.org/wiki/" + parts[1];
  }

  //called every time a topic is loaded
  function resetData() {
    networkGraph.reset();
    dataProcessor.initFilterer(listOfDates, listOfNodes, listOfEvents, listOfConcepts);

  }
  function loadTopicData(indexOfData, callback, callbackArgs) {
    let pathEvents = mainDataFolder + eventsFileName + indexOfData + ".jsonl";
    let pathConcepts = mainDataFolder + conceptsFileName + indexOfData + ".jsonl";
    let pathNodes = mainDataFolder + nodesFileName + indexOfData + ".jsonl";
    let pathListOfDates = mainDataFolder + datesFileName + indexOfData + ".jsonl";
    let pathCloudData = mainDataFolder + characteristicsFileName + (indexOfData) + ".jsonl";
    d3.json(pathEvents,
      function (error, events) {
        if (error) {
          console.log(error);
          console.log("in events file number " + indexOfData);
        }
        d3.json(pathListOfDates,
          function (error, dates) {
            if (error) {
              console.log(error);
              console.log("in listOfDates file number " + indexOfData);
            }
            d3.json(pathConcepts,
              function (error, concepts) {
                if (error) {
                  console.log(error);
                  console.log("in concepts file number " + indexOfData);
                }
                d3.json(pathNodes,
                  function (error, nodes) {
                    if (error) {
                      console.log(error);
                      console.log("in nodes file number " + indexOfData);
                    }
                    d3.json(pathCloudData,
                      function (error, cloudData) {
                        if (error) {
                          console.log(error);
                          console.log("in cloud file number " + indexOfData);
                        }
                        listOfEvents = events;
                        listOfDates = dates;
                        listOfNodes = nodes;
                        listOfConcepts = concepts;
                        topicCloud = cloudData;
                        console.log(listOfDates);
                        if (callback !== undefined) {
                          callback(callbackArgs);
                        }
                      });
                  });
              });
          });
      });
  }

  function processTopicData() {
    listOfDates.forEach(function (cur) {
      cur.date = new Date(cur.date);
    });
    topicCloud = topicCloud.slice(0, wordsPerCloudThreshold);
    topicCloud.forEach(function (cur) {
      cur.link = getWikiLink(cur.link);
    });

    resetData();
    slider.updateSlider(listOfDates);
    tagCloud.drawCloud(topicCloud, "cloud-div");
    createSearchBar(document.getElementById("entity-input"),
      listOfNodes.map(function (d) { return { id: d, title: listOfConcepts[d].concept.title }; }),
      fixNode);
  }


  //helper functions for events handlers
  function fillSummary(d, tabNumber) {
    let totalArticles = 0;
    let curConceptEvents = listOfConcepts[d.id].events;
    let listOfTitles = [];
    for (let i = d.rangeBeg; i < d.rangeEnd; ++i) {
      let curEvent = curConceptEvents[i];
      listOfTitles.push({ "id": curEvent.id, "score": curEvent.score * curEvent.artScr, "title": listOfEvents[curEvent.id].title });
      totalArticles += curEvent.artScr;
    }
    listOfTitles = listOfTitles.slice(0, topEventsThreshold);
    interfaceActionsHandler.fillEntitySummary(tabNumber, {
      title: d.title,
      id: d.id,
      type: +d.type === 1 ? "person" : "organization",
      uri: getWikiLink(listOfConcepts[d.id].concept.uri),
      totalEvents: d.rangeEnd - d.rangeBeg,
      totalArticles: totalArticles,
      topEvents: listOfTitles
    });
  }
  function formStreamLinksForPair(node1, node2) {
     // get all the events
    let concept1Events = listOfConcepts[node1.id].events;//.slice(node1.rangeBeg, node1.rangeEnd);
    let concept2Events = listOfConcepts[node2.id].events;//.slice(node2.rangeBeg, node2.rangeEnd);
    //do two pointers to get the number of similar once

    // the score of the edge is the min(scoreConcept1,scoreConcept2)
    let commonEvents = [];
    let l1 = 0, l2 = 0;
    while (l1 < concept1Events.length && l2 < concept2Events.length) {
      let id1 = concept1Events[l1].id, id2 = concept2Events[l2].id;
      if (id1 === id2) {
        let tempScr = Math.min(concept1Events[l1].score, concept2Events[l2].score);

        commonEvents.push({
          "id": id1,
          "title": listOfEvents[id1].title,
          "score": tempScr * listOfEvents[id1].totArtCnt
        });
        ++l1;
        ++l2;
      }
      else if (listOfEvents[id1].date < listOfEvents[id2].date)
        ++l1;
      else
        ++l2;
    }
    convertToStreamData(commonEvents);
  }
  function convertToStreamData(linksEvent) {
    // the scores are calculated based on the total sum of score of each concept in all the events per date
    let listOfConceptsByOcc = {};

    for (let i = 0; i < linksEvent.length; ++i) {
      let singleSharedEvent = listOfEvents[linksEvent[i].id];
      let conceptsOfOneEvent = singleSharedEvent.concepts;
      let curDate = singleSharedEvent.date;

      Object.keys(conceptsOfOneEvent).forEach(function (conceptId) {
        let curConcept = listOfConcepts[conceptId];
        let curConceptScore = conceptsOfOneEvent[conceptId];
        let type = curConcept.concept.type;
        if (!(type === "person" || type === "org" || type === "loc")) {
          if (!listOfConceptsByOcc.hasOwnProperty(conceptId))
            listOfConceptsByOcc[conceptId] = {
              "title": curConcept.concept.title,
              "dates": {},
              "scoreOfFiltering": 0
            };

          let temp = listOfConceptsByOcc[conceptId];
          if (!temp.dates.hasOwnProperty(curDate))
            temp.dates[curDate] = curConceptScore, temp.scoreOfFiltering++;
          else
            temp.dates[curDate] += curConceptScore;
        }
      });
    }

    let arrOfConcepts = Object.keys(listOfConceptsByOcc);
    arrOfConcepts.sort(function (a, b) {
      return listOfConceptsByOcc[b].scoreOfFiltering - listOfConceptsByOcc[a].scoreOfFiltering;
    });
    let limit = 10;

    arrOfConcepts = arrOfConcepts.slice(0, limit);
    let streamData = {};
    let sharedEntityConcepts = [];

    arrOfConcepts.forEach(function (curId) {
      let title = listOfConceptsByOcc[curId].title;
      sharedEntityConcepts.push(title);
      let curConceptDatesObj = listOfConceptsByOcc[curId].dates;

      Object.keys(curConceptDatesObj).forEach(function (curDate) {
        if (!streamData.hasOwnProperty(curDate))
          streamData[curDate] = { "time": curDate, title: curConceptDatesObj[curDate] };
        else
          streamData[curDate][title] = curConceptDatesObj[curDate];
      });
    });
    //TODO handle when two concepts have the same name (if any?)
    streamData = Object.values(streamData);

    streamData.sort(function (a, b) {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
   
    drawStreamGraph(streamData, sharedEntityConcepts, "stream-div");
  }
  //events handlers
  function clusterChosen(clusterChosen) {
    interfaceActionsHandler.initTopic(clusterChosen);
    interfaceActionsHandler.initToolBoxes();
    currentTopic = clusterChosen;
    loadTopicData(clusterInfo[clusterChosen].idx, processTopicData, undefined);
  }
  function intervalSelected(filterDateFrom, filterDateTo, timeFormatter) {
    dataProcessor.filterData(
      filterDateFrom,
      filterDateTo,
      timeFormatter,
      nodeThreshold,
      edgeThreshold,
      currentTopic,
      dataProcessed
    );
  }
  function datesUpdated(newListOfDates) {
    slider.updateSlider(newListOfDates);
  }
  function dataProcessed(newGraph) {
    networkGraph.updateGraph(newGraph);
  }
  function pairNodeUnselected() {
    interfaceActionsHandler.showPairRelationTabs(false);
  }
  function nodeSelected(node) {
    convertToStreamData(listOfConcepts[node.id].events);
  }
  function nodeOver(node, nodeNumber) {
    if (nodeNumber === "first") {
      interfaceActionsHandler.showFirstEntitySummaryTab(true);
      fillSummary(node, "tab1");
    } else {
      interfaceActionsHandler.showSecondEntitySummaryTab(true);
      fillSummary(node, "tab2");
    }
  }
  function nodeOut(node, nodeNumber) {
    if (nodeNumber === "first") {
      interfaceActionsHandler.showFirstEntitySummaryTab(false);
      interfaceActionsHandler.clearSummary("tab1");
    } else {
      interfaceActionsHandler.showSecondEntitySummaryTab(false);
      interfaceActionsHandler.clearSummary("tab2");
    }
  }
  function fixNode(conceptId) {
    dataProcessor.fixNode(conceptId, interfaceActionsHandler.addLinkedTag);
  }
  function nodeRightClicked(node) {
    fixNode(node.id);
  }
  function pairNodeSelected(curEdge, firstNode, secondNode) {
    fillSummary(secondNode, "tab2");
    let topSharedCharacteristicThreshold = 10;
    let linkEvents = curEdge.events;
    interfaceActionsHandler.showPairRelationTabs(true);

    interfaceActionsHandler.fillPairRelationSummary({
      first: {
        title: firstNode.title,
        type: +firstNode.type === 1 ? "person" : "organization"
      },
      second: {
        title: secondNode.title,
        type: +secondNode.type === 1 ? "person" : "organization"
      },
      totalSharedEvents: linkEvents.length,
      totalSharedArticles: linkEvents.reduce(function (acc, cur) {
        return acc + listOfEvents[cur.id].totArtCnt;
      }, 0),
      tags: curEdge.cloudData.slice(0, topSharedCharacteristicThreshold).map(function (curConcept) {
        return {
          title: curConcept.title + " (" + Math.round(curConcept.score) + " %)",
          link: getWikiLink(curConcept.link)
        };
      }),
      topSharedEvents: linkEvents.map(function (cur) {
        return {
          title: listOfEvents[cur.id].title,
          score: cur.score * listOfEvents[cur.id].totArtCnt
        };
      })
    });
    formStreamLinksForPair(firstNode, secondNode);
    let curCloud = curEdge.cloudData.slice(0, wordsPerCloudThreshold);
    curCloud.forEach(function (cur) {
      cur.link = getWikiLink(cur.link);
    });
    tagCloud.drawCloud(curCloud, "cloud-div");
  }

  this.startProgram = function () {
    loadConfigurations(init, undefined);
  };

}