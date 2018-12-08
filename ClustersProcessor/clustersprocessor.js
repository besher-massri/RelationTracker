'use strict';
//importing packages
let fs = require('fs');
const request = require('request');
//containers
let wholeData = {};
let listOfNames = {};
//counters
let totalNumberProcessed = 0;
// parameters:
let configPath = "../config.jsonl";
let eventRegistryApiKey;
let NTopics;
let scoreWeightMinThreshold = 3;
let scoreWeightMultiplicityRatio = 10;
let outputDir;
let characteristicsFileName;
let eventsFileName;
let conceptsFileName;
let nodesFileName;
let datesFileName;
let clusterNamesFileName;
let fromDate;
let toDate;

/*
 * Expected format of the data:
 *  the output of the eventAnalyzer program
 */
/* the program do further enrichment for the clusters
 * it does the following:
 *    
 *  for results_cloudX files:
 *    it sortes the array based on the "score" attribute
 *  
 *  for results_events files:
 *    If date filtering is on, it filter the events to only those that falls
 *        in the selected dates(tuning paramter)
 *      it updates the events in the concepts array & events array
 *      it remove the concepts that no longer have events (due to filtering)
 *        from the concepts,events, and nodes array
 *    It sorts the events based on their dates in the concepts array
 *    For each concept in the concepts array, it create a prefix sum element 
 *      called artScr to aggregate the totalArticleCount for all the events 
 *      in that concept
 *    It also aggregate the values of the attribute "score" as a prefix sum,
 *      and stores it in place of the original value
 *    Add an array of all the dates along with their frequencies
 *    
 *  It adds a new file called clusterNames.json, which stores the possible
 *    names of the topic
 */

//helper methods
function escape(str) {
  return str.replace(/\\u/g, '%u');
  //return str;
}
function unescape(str) {
  return str.replace(/%u/g, '\\u');
  //return str;
}
//loadConfigurations
function loadConfigurations() {
  let config = JSON.parse(escape(require('fs').readFileSync(configPath, 'utf8')));
  NTopics = config.NTopics;
  outputDir = config.outputDir;
  characteristicsFileName = config.characteristicsFileName;
  eventsFileName = config.eventsFileName;
  conceptsFileName = config.conceptsFileName;
  nodesFileName = config.nodesFileName;
  datesFileName = config.datesFileName;
  clusterNamesFileName = config.clusterNamesFileName;
  fromDate = config.fromDate;
  toDate = config.toDate;
  eventRegistryApiKey = config.eventRegistryApiKey;
}
//method to randomly shuffle an array
function shuffle(a) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
//method used to filter the data to only events falls within the selected years
let filterDateFunction = function (cur) {
  return fromDate <= cur && cur <= toDate;
};
function getName(fileNumber) {
  let text = listOfNames[fileNumber];
  //call the categorization service from eventRegistry
  request.get({
    url: "http://analytics.eventregistry.org/api/v1/categorize",
    qs: {
      "text": text,
      "taxonomy": "dmoz",
      "apiKey": eventRegistryApiKey
    }
  }, function (error, response, body) {
    if (error) {
      console.log("error in fetching from api,file counter =" + fileNumber +
        " \nerror is: ", error);
    }

    body = JSON.parse(escape(body));
    wholeData["cluster" + fileNumber] = body;

    totalNumberProcessed++;
    console.log("Fetched the possible names for topic number ",
      totalNumberProcessed);

    if (totalNumberProcessed === NTopics) {
      //let jsonToWrite = unescape(JSON.stringify(wholeData));
      fs.writeFileSync(outputDir + clusterNamesFileName + '.jsonl', unescape(JSON.stringify(wholeData)), 'utf8');

      //fs.writeFile(outputDir + clusterNamesFileName + '.jsonl',
      //  jsonToWrite, 'utf8', function (err) {

      //    if (err) { throw err; }
      //  });
      console.log("Finished fetching topic names");
    } else
      getName(fileNumber + 1);
  });
}
//program begin here
//==================================================================

loadConfigurations();
//async version
//let testJson = JSON.parse(escape(require('fs').readFileSync(outputDir + "test.jsonl", 'utf8')));
//fs.writeFile(outputDir + "test.jsonl",
//  unescape(JSON.stringify(testJson)), 'utf8', function (err) {
//    if (err) { throw err; }

//  });
//return 0;

//sort the concepts events list based on events date
for (let FileCounter = 0; FileCounter < NTopics; ++FileCounter) {
  let events = JSON.parse(escape(require('fs').readFileSync(outputDir
    + eventsFileName + FileCounter + '.jsonl', 'utf8')));
  let concepts = JSON.parse(escape(require('fs').readFileSync(outputDir
    + conceptsFileName + FileCounter + '.jsonl', 'utf8')));
  let nodes = JSON.parse(escape(require('fs').readFileSync(outputDir
    + nodesFileName + FileCounter + '.jsonl', 'utf8')));
  Object.keys(concepts).forEach(function (key) {
    let conceptsEvent = concepts[key].events;
    // filter the concepts events by date filter function
    conceptsEvent = conceptsEvent.filter(function (cur) {
      return filterDateFunction(events[cur.id].date);
    });
    //sort the events in the concepts based on their date
    if (conceptsEvent.length > 0) {
      conceptsEvent.sort(function (a, b) {
        let dat1 = events[a.id].date, dat2 = events[b.id].date;
        if (dat1 < dat2) { return -1; }
        if (dat1 > dat2) { return 1; }
        return 0;
      });
      // make partial sum of scores from the totalArticleScore, 
      // convert the score attribute to prefix sum also
      //stored also in events object, used for fast computing of range sum
      conceptsEvent.forEach(function (cur, idx) {
        if (idx > 0) {
          cur.score += conceptsEvent[idx - 1].score;
          cur.artScr = events[cur.id].totArtCnt
            + conceptsEvent[idx - 1].artScr;
        } else {
          cur.artScr = events[cur.id].totArtCnt;
        }
      });
      //update the events array
      concepts[key].events = conceptsEvent;

    } else {// no events for it, delete THE WHOLE CONCEPT
      delete concepts[key];
    }
  });
  // now filter the events themselves
  Object.keys(events).forEach(function (key) {
    if (!filterDateFunction(events[key].date)) {
      delete events[key];
    }
  });


  //form a list of dates along with its frequency
  let ObjOfDates = {};
  Object.keys(events).forEach(function (key) {
    events[key].conceptCnt = Object.keys(events[key].concepts).length;
  });
  Object.keys(events).forEach(function (key) {
    if (!ObjOfDates.hasOwnProperty(events[key].date)) {
      ObjOfDates[events[key].date] = 1;
    } else {
      ObjOfDates[events[key].date]++;
    }
  });
  let listOfDates = [];
  Object.keys(ObjOfDates).forEach(function (key) {
    listOfDates.push({ "date": key, "cnt": ObjOfDates[key] });
  });
  listOfDates.sort(function (a, b) {
    if (a.date < b.date) { return -1; }
    if (a.date > b.date) { return 1; }
    return 0;
  });
  listOfDates.forEach(function (cur, idx) {
    if (idx > 0) {
      cur.cnt += listOfDates[idx - 1].cnt;
    }
  });

  //update the list of nodes id:data.nodes, since some of them got filtered
  //  based on the date
  nodes = nodes.filter(function (cur) {
    return concepts.hasOwnProperty(cur);
  });
  fs.writeFileSync(outputDir + eventsFileName + FileCounter + '.jsonl', unescape(JSON.stringify(events)), 'utf8');
  fs.writeFileSync(outputDir + conceptsFileName + FileCounter + '.jsonl', unescape(JSON.stringify(concepts)), 'utf8');
  fs.writeFileSync(outputDir + nodesFileName + FileCounter + '.jsonl', unescape(JSON.stringify(nodes)), 'utf8');
  fs.writeFileSync(outputDir + datesFileName + FileCounter + '.jsonl', unescape(JSON.stringify(listOfDates)), 'utf8');
  console.log("processed cluster number " + FileCounter);

  //write the output to the file
  //asnyc version
  //fs.writeFile(outputDir + eventsFileName + FileCounter + '.jsonl',
  //  unescape(JSON.stringify(events)), 'utf8', function (err) {
  //    if (err) { throw err; }
  //    console.log("processed events from cluster number " + FileCounter);
  //  });
  //fs.writeFile(outputDir + conceptsFileName + FileCounter + '.jsonl',
  //  unescape( JSON.stringify(concepts)), 'utf8', function (err) {
  //    if (err) { throw err; }
  //    console.log("processed concepts from cluster number " + FileCounter);
  //  });
  //fs.writeFile(outputDir + nodesFileName + FileCounter + '.jsonl',
  //  unescape(JSON.stringify(nodes)), 'utf8', function (err) {
  //    if (err) { throw err; }
  //    console.log("processed nodes from cluster number " + FileCounter);
  //  });
  //fs.writeFile(outputDir + datesFileName + FileCounter + '.jsonl',
  //  unescape(JSON.stringify(listOfDates)), 'utf8', function (err) {
  //    if (err) { throw err; }
  //    console.log("added list of dates for cluster number " + FileCounter);
  //  });
}


//a method for preparing the texts for getting the names of the clusters
for (let fileCounter = 0; fileCounter < NTopics; ++fileCounter) {
  // sort the cloud data file based on score
  let data = JSON.parse(escape(require('fs').readFileSync(outputDir +
    characteristicsFileName + fileCounter + '.jsonl', 'utf8')));
  data.sort(function (a, b) {
    return b.score - a.score;
  });
  fs.writeFileSync(outputDir + characteristicsFileName + fileCounter + '.jsonl', unescape(JSON.stringify(data)), 'utf8');

  //fs.writeFile(outputDir + characteristicsFileName + FileCounter + '.jsonl',
  //  unescape(JSON.stringify(data)), 'utf8', function (err) {
  //    if (err) { throw err; }
  //  });
  //form the text out of the those weights, where each weight contribute 
  //  with floor(conceptWeightScore / scoreWeightMultiplicityRatio) as long as 
  //  its weight score is at least "scoreWeightMinThreshold"
  let textArr = [];
  let text = "";
  for (let i = 0; i < data.length &&
    data[i].score >= scoreWeightMinThreshold; ++i) {

    let repetition = Math.floor(data[i].score / scoreWeightMultiplicityRatio) + 1;
    while (repetition-- > 0) {
      textArr.push(data[i].title);
    }
  }
  //shuffling the array to prevent the effect of  repeated word at the 
  //  beginning(it cause some bias, tested experimentally)
  textArr = shuffle(textArr);
  //grouping the array into text
  textArr.forEach(function (cur) {
    text += cur + " ";
  });
  console.log("Processed cloud file ", fileCounter);
  //it stores the text in an object to be used later in getNames method
  listOfNames[fileCounter] = text;
}

getName(0);
