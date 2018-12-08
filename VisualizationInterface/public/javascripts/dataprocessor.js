'use strict';
function DataProcessor() {
  //parameters
  let edgePercentageOfWeightRatio = 2.0 / 3;

  //reference variables

  let _filterDateFrom, _filterDateTo, _timeFormatter;
  let _listOfDates;
  let _listOfNodes;
  let _listOfEvents;
  let _listOfConcepts;
  let _nodeThreshold;
  let _edgeThreshold;
  let _eventRegistryApiKey;

  //internal containers
  let entitiesObj;
  let chosenNodes;
  let newGraph;
  let manualBlackList = {
    //id:title
  };
  let edgeCallingCounter;
  //tracking nodes tools
  let fixedNodes;
  let choseOnly;
  let trackerActivated;
  this.init = function (eventRegistryApiKey) {
    _eventRegistryApiKey = eventRegistryApiKey;
  };
  this.initFilterer = function (listOfDates,
    listOfNodes,
    listOfEvents,
    listOfConcepts) {
    _listOfDates = listOfDates;
    _listOfNodes = listOfNodes;
    _listOfConcepts = listOfConcepts;
    _listOfEvents = listOfEvents;
    fixedNodes = {};
    choseOnly = false;
    trackerActivated = false;

  };
  this.filterData = function (
    filterDateFrom,
    filterDateTo,
    timeFormatter,
    globalNodeThreshold,
    globalEdgeThreshold,
    clusterName,
    callback) {
    _filterDateFrom = filterDateFrom;
    _filterDateTo = filterDateTo;
    _timeFormatter = timeFormatter;
    _nodeThreshold = globalNodeThreshold;
    _edgeThreshold = globalEdgeThreshold;
    // store the entity nodes as object also
    entitiesObj = {};
    _listOfNodes.forEach(function (cur) {
      return entitiesObj[cur] = 1;
    });
    edgeCallingCounter = 0;
    _filterDateFrom = _timeFormatter(_filterDateFrom);
    _filterDateTo = _timeFormatter(_filterDateTo);
    newGraph = {};
    newGraph.nodes = [];
    newGraph.links = [];
    chosenNodes = {};
    extractChosenNodes();
    extractAndFilterEdges();
    // filtering the data that aren't connecting to connected elements
    // filtering the ones who has only one repetition
    //let listOfEdgeKeys = Object.keys(graph.edges);
    if (newGraph.links.length) {
      for (let i = 0; i < newGraph.links.length; ++i) {
        calcCloudDataAndRelationships(newGraph.links[i], clusterName, callback);
      }
    } else {
      drawData(callback);
    }
  };
  function getRange(len, getItemFun, compareFun, lowerBound, upperBound) {
    let l = 0, r = len - 1, mid;
    //left border
    while (l <= r) {
      mid = Math.floor((l + r) / 2);
      let temp = getItemFun(mid);
      if (compareFun(temp) >= lowerBound)
        r = mid - 1;
      else
        l = mid + 1;
    }
    let leftBorder = l;
    //right border
    l = 0, r = len - 1;
    while (l <= r) {
      mid = Math.floor((l + r) / 2);
      let temp = getItemFun(mid);
      if (compareFun(temp) <= upperBound)
        l = mid + 1;
      else
        r = mid - 1;
    }
    let rightBorder = r + 1;// +1 because we want the first one that is bigger
    return { "begin": leftBorder, "end": rightBorder, "len": rightBorder - leftBorder };
  }

  function extractChosenNodes() {
    _listOfNodes = _listOfNodes.filter(function (nodeId) {
      return !manualBlackList.hasOwnProperty(nodeId);
    });
    _listOfNodes.forEach(function (nodeId) {
      let curConcept = _listOfConcepts[nodeId];
      let conceptsEvents = curConcept.events;
      let range = getRange(conceptsEvents.length,
        function (mid) {
          return new Date(_listOfEvents[conceptsEvents[mid].id].date);
        },
        function (cur) {
          return _timeFormatter(cur);
        },
        _filterDateFrom,
        _filterDateTo);
      // get the partial sum of scores of that concept in 
      let partialSumConceptScr, partialSumArtScr;
      //only Add those who has at least one date
      if (range.len > 0) {
        partialSumConceptScr = conceptsEvents[range.end - 1].score
          - (range.begin > 0 ? conceptsEvents[range.begin - 1].score : 0);

        partialSumArtScr = conceptsEvents[range.end - 1].artScr
          - (range.begin > 0 ? conceptsEvents[range.begin - 1].artScr : 0);


        //calculating TF-IDF score of the concept Scores
        let counter = partialSumConceptScr;
        counter /= range.len;
        let rangeOfAllEvents = getRange(_listOfDates.length,
          function (mid) { return _listOfDates[mid].date; },
          function (cur) { return _timeFormatter(cur); },
          _filterDateFrom,
          _filterDateTo);
        let totalLength;
        if (rangeOfAllEvents.len > 0) {
          totalLength = _listOfDates[rangeOfAllEvents.end - 1].cnt -
            (rangeOfAllEvents.begin > 0 ? _listOfDates[rangeOfAllEvents.begin - 1].cnt : 0);
        } else {
          totalLength = 0;
        }
        let temp = totalLength / (range.len > 0 ? range.len : 1);
        let counter2 = Math.log(temp ? temp : 1);
        //TF*IDF
        counter *= counter2;

        newGraph.nodes[nodeId] = {
          "id": nodeId,
          "title": curConcept.concept.title,
          "type": curConcept.concept.type === "person",
          "rangeBeg": range.begin,
          "rangeEnd": range.end,
          "eventScore": partialSumConceptScr,
          "articleScore": partialSumArtScr,
          "tf-idf": counter,
          "initScore": counter * partialSumArtScr,
          "accScore": 0
        };
      } else
        partialSumConceptScr = partialSumArtScr = 0;
    });
    let nodes = newGraph.nodes;
    // negative importance
    Object.keys(nodes).forEach(function (conceptId) {
      let curConcept = _listOfConcepts[conceptId];
      let conceptsEvents = curConcept.events;
      let initScore = nodes[conceptId].initScore;
      let conceptNeighbors = new Set();
      //calculate the neighbors of the concept
      conceptsEvents.forEach(function (cur) {
        let conceptEventConcepts = _listOfEvents[cur.id].concepts;
        Object.keys(conceptEventConcepts).forEach(function (subConceptId) {
          if (subConceptId !== cur.id && nodes.hasOwnProperty(subConceptId)) {
            conceptNeighbors.add(subConceptId);
          }
        });
      });
      let negativeScore = initScore / conceptNeighbors.size;
      conceptNeighbors.forEach(function (cur) {
        nodes[cur].accScore -= negativeScore;
      });
      //alternative method, a bit faster, it's more simplified version of the negative importance
      //  instead of penalizing each shared concept once, penalize it as many as the number of shared
      //  events between them, and for the number of neighbors, count the duplicates,
      //let numberOfLinks=0;
      //conceptsEvents.forEach(function (cur) {
      //  numberOfLinks += listOfEvents[cur.id].conceptCnt;
      //});
      //let negativeScore = initScore / numberOfLinks;
      //conceptsEvents.forEach(function (cur) {
      //  let conceptEventConcepts = listOfEvents[cur.id].concepts;
      //  Object.keys(conceptEventConcepts).forEach(function (subConceptId) {
      //    if (subConceptId !== conceptId && nodes.hasOwnProperty(subConceptId)) {
      //      nodes[subConceptId].accScore -= negativeScore;
      //    }
      //  });
      //});
    });
    //adding the fixed nodes first only, added it here to speed up the process, since the nodes here is an object, so the search in them is fast
    let listOfChosenNodesInfo = [];
    if (trackerActivated) {
      Object.keys(fixedNodes).forEach(function (chosenId) {
        if (newGraph.nodes.hasOwnProperty(chosenId)) {
          listOfChosenNodesInfo.push(newGraph.nodes[chosenId]);
        }
      });
    }
    // now it becomes an array 
    newGraph.nodes = Object.values(nodes);
    // form the final value
    newGraph.nodes.forEach(function (cur) {
      cur.value = cur.initScore + cur.accScore;
    });
    // and sort by it
    newGraph.nodes.sort(function (a, b) {
      return b.value - a.value;
    });
    // now to add the rest of the top nominated nodes, while keeping track of the already added as a fixed nodes, let's add the fixed nodes to the chosen nodes at first
    nodes = newGraph.nodes;
    let numOfChosenNodes = listOfChosenNodesInfo.length;
    for (let i = 0; i < numOfChosenNodes; ++i)
      chosenNodes[listOfChosenNodesInfo[i].id] = 1;
    // in case there is no filtering or there is but with not exclusive filtering
    // now we will keep adding from the top nodes until the number of chosen nodes reach the node threshold or there is no more array elements to add
    if (!trackerActivated || !choseOnly) {
      for (let i = 0; i < nodes.length && listOfChosenNodesInfo.length < _nodeThreshold; ++i) {
        let curNode = nodes[i];
        if (!chosenNodes.hasOwnProperty(curNode.id)) {
          chosenNodes[curNode.id] = 1;
          listOfChosenNodesInfo.push(curNode);
        }
      }
    }
    newGraph.nodes = listOfChosenNodesInfo;
  }
  function extractAndFilterEdges() {
    let nodes = newGraph.nodes;
    nodes.forEach(function (node1, idx1) {
      for (let idx2 = idx1 + 1; idx2 < nodes.length; ++idx2) {
        let node2 = nodes[idx2];
        let concept1 = _listOfConcepts[node1.id];
        let concept2 = _listOfConcepts[node2.id];
        let concept1Events = concept1.events.slice(node1.rangeBeg, node1.rangeEnd);
        let concept2Events = concept2.events.slice(node2.rangeBeg, node2.rangeEnd);
        //do two pointers to get the number of similar once
        // the score of the edge is the min(scoreConcept1,scoreConcept2)
        let commonEvents = [];
        let l1 = 0, l2 = 0;
        let totEventScr = 0;
        while (l1 < concept1Events.length && l2 < concept2Events.length) {
          let id1 = concept1Events[l1].id, id2 = concept2Events[l2].id;
          if (id1 === id2) {
            let tempScr = Math.min(concept1Events[l1].score, concept2Events[l2].score);
            commonEvents.push({ "id": id1, "score": tempScr });
            totEventScr += tempScr;
            ++l1;
            ++l2;
          }
          else if (_listOfEvents[id1].date < _listOfEvents[id2].date) {
            ++l1;
          } else {
            ++l2;
          }
        }
        if (commonEvents.length >= _edgeThreshold) {
          let id1 = node1.id, id2 = node2.id;
          if (id1 > id2) { let temp = id1; id1 = id2; id2 = temp; }
          newGraph.links.push({
            "id": id1 + "_" + id2,
            "source": id1,
            "target": id2,
            "value": commonEvents.length,
            "events": commonEvents,
            "totalEventScr": totEventScr
          });
        }
      }
    });
    // filter the number of edges based on the edge-weight ratio

    //first, calculate the total weight of all edges
    let totalWeightOfEdges = newGraph.links.reduce(function (prev, cur) {
      return prev + cur.value;
    }, 0);
    // second, sort the links in descending order
    newGraph.links.sort(function (a, b) {
      return b.value - a.value;
    });
    let thresholdOnNumberOfEdges = 0, currentSumOfEdgesWeight = 0;
    while (thresholdOnNumberOfEdges < newGraph.links.length
      && currentSumOfEdgesWeight / totalWeightOfEdges < edgePercentageOfWeightRatio) {

      currentSumOfEdgesWeight += newGraph.links[thresholdOnNumberOfEdges].value;
      thresholdOnNumberOfEdges++;
    }
    newGraph.links = newGraph.links.slice(0, thresholdOnNumberOfEdges);

  }
  // labels changed to become the first non entity concept in terms of score
  function calcCloudDataAndRelationships(curEdge, clusterName, callback) {
    let linksEvent = curEdge.events;
    let mx = 0;
    let sharedNonEntityConcepts = {};
    for (let i = 0; i < linksEvent.length; ++i) {
      let singleSharedEvent = _listOfEvents[linksEvent[i].id];
      let conceptsOfOneEvent = singleSharedEvent.concepts;
      Object.keys(conceptsOfOneEvent).forEach(function (conceptId) {
        if (!entitiesObj.hasOwnProperty(conceptId)) {
          let score = conceptsOfOneEvent[conceptId];
          if (!sharedNonEntityConcepts.hasOwnProperty(conceptId))
            sharedNonEntityConcepts[conceptId] = score;
          else
            sharedNonEntityConcepts[conceptId] += score;

          mx = Math.max(mx, sharedNonEntityConcepts[conceptId]);
        }
      });
    }
    let srtArr = Object.keys(sharedNonEntityConcepts).sort(function (a, b) {
      return sharedNonEntityConcepts[b] - sharedNonEntityConcepts[a];
    });
    let scoreScale = d3.scaleLinear().domain([0, mx]).range([0, 100]);
    let req = "";
    let cloudData = [];
    for (let i = 0; i < srtArr.length; ++i) {
      let key = srtArr[i];
      let titleOfConcept = _listOfConcepts[key].concept.title;
      let scoreOfConcept = sharedNonEntityConcepts[key];
      let linkOfConcept = _listOfConcepts[key].concept.uri;
      let cloudScore = d3.scalePow()
        .exponent(2)
        .range([0, 10])
        .domain([0, mx]);
      if (req.length < 10000) {
        let name = titleOfConcept.replace("#", "");
        let rep = cloudScore(scoreOfConcept);// scoreScale(scoreOfConcept);
        for (let j = 0; j < rep; ++j)
          req += name + "%20";
      }
      scoreOfConcept = scoreScale(scoreOfConcept);
      cloudData.push({
        "title": titleOfConcept,
        "score": scoreOfConcept,
        "link": linkOfConcept
      });
    }
    let pathEventRegistry = "http://analytics.eventregistry.org/api/v1/categorize?text="
      + req
      + "&taxonomy=dmoz&apiKey=" + _eventRegistryApiKey;
    d3.json(pathEventRegistry, function (error, dataInfo) {
      if (error) {
        console.log(error);
        console.log("in fetching labels");
      }
      let clusterKeywords = dataInfo.keywords;
      let chosenLabel = clusterKeywords.length ? clusterKeywords[0].keyword : "";//"NO_LABEL";
      if (chosenLabel === clusterName && clusterKeywords.length > 1) {
        chosenLabel = clusterKeywords[1].keyword;
      }
      curEdge.label = chosenLabel;
      curEdge.cloudData = cloudData;
      ++edgeCallingCounter;
      if (edgeCallingCounter >= newGraph.links.length) {
        drawData(callback);
      }
    });
  }
  function drawData(callback) {
    callback(newGraph);
  }

  this.updateFilter = function (value) {
    choseOnly = value;
  };

  this.fixNode = function (conceptId, callback) {
    if (fixedNodes.hasOwnProperty(conceptId))
      return;

    fixedNodes[conceptId] = 1;
    callback(_listOfConcepts[conceptId].concept.title, this.unFixNode, conceptId);

  };
  this.unFixNode = function (conceptId) {
    delete fixedNodes[conceptId];
  };

  this.trackFilteredNodes = function (callback) {
    if (fixedNodes === undefined || Object.keys(fixedNodes).length === 0) { return; }
    let datesObj = {};
    Object.keys(fixedNodes).forEach(function (conceptId) {
      let conceptEvents = _listOfConcepts[conceptId].events;
      conceptEvents.forEach(function (singleEvent) {
        let curDate = _listOfEvents[singleEvent.id].date;
        if (!datesObj.hasOwnProperty[curDate])
          datesObj[curDate] = {
            "date": curDate,
            "cnt": 1
          };
        else
          datesObj[curDate].cnt++;
      });
    });
    let tempListOfDates = Object.values(datesObj).map(function (cur) {
      cur.date = new Date(cur.date);
      return cur;
    }).sort(function (a, b) {
      return a.date - b.date;
    });
    trackerActivated = true;
    callback(tempListOfDates);
  };

  this.cancelTracking = function (callback) {
    trackerActivated = false;
    callback(_listOfDates);
  };
}