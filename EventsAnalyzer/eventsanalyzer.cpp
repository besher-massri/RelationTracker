#define _CRT_SECURE_NO_WARNINGS
#include <string>
#include <fstream>
#include "../Lib/kmeans.h"
#include "../Lib/jsonparser.cpp"

typedef pair<int, int> ii;
typedef vector<ii> vii;
typedef vector<int> vi;
typedef JsonParser jp;
typedef Array ja;

string configPath = "../config.jsonl";
//parameters
int NTopics;
// the lowest possible distance for a vector to be in a cluster
string eventsFilesPath;
int eventsFilesOffset;
int eventsFilesThreshold;
string outputDir;
string autoBlackListFileName;
string manualBlackListFilePath;
string eventsFileName;
string conceptsFileName;
string nodesFileName;
string characteristicsFileName;


void loadConfigurations() {
  jp config(loadFile(configPath));
  NTopics =config.getNumberAsInt("NTopics");
  eventsFilesPath = config.getString("eventsFilesPath");
  eventsFilesOffset = config.getNumberAsInt("eventsFilesOffset");
  eventsFilesThreshold = config.getNumberAsInt("eventsFilesThreshold");
  outputDir =
    config.getString("outputDir");
  //outputFolder should be loaded before loading the blacklist paths
  autoBlackListFileName
    = outputDir + config.getString("autoBlackListFileName");
  manualBlackListFilePath
    = config.getString("manualBlackListFilePath");
  eventsFileName = config.getString("eventsFileName");
  conceptsFileName = config.getString("conceptsFileName");
  nodesFileName = config.getString("nodesFileName");
  characteristicsFileName = config.getString("characteristicsFileName");
}
string shortenWiki(string wikiLong) {
  string wikiShort;
  int i;
  const int n = static_cast<int>(wikiLong.length());
  for (i = 9; i < n && wikiLong[i] != '.'; ++i) {
    wikiShort += wikiLong[i];
  }
  wikiShort += "$";
  i += 22;
  while (i < n) {
    wikiShort += wikiLong[i++];
  }
  return wikiShort;
}
int main() {
  loadConfigurations();
  //Concept types constants
  string personType = "person";
  string organizationType = "org";
  string locationType = "loc";
  string wikiType = "wiki";
  set<string> entityTypes({ personType,organizationType,locationType });
  set<string> nonEntityTypes({ wikiType });
  //statistical counters
  int totalEvents = 0;
  int numberOfEmptyVectors = 0;
  int UniqueNonEntityConceptsCounter = 0;
  int totalNonEntityConcepts = 0;
  int totalConcepts = 0;
  int totalLocationConcepts = 0;
  int totalEntityConcepts = 0;
  int uniqueEntityConcepts = 0;
  int numberOfNonEmptyEvents = 0;
  int totalClusteredEvents = 0;
  //blackList variables
  int totalFilteredItemsByAutoBlackList = 0;
  int totalFilteredItemsByManualBlackList = 0;
  set<string> FilteredItemsByAutoBlackListSet;
  set<string> FilteredItemsByManualBlackListSet;
  //those retrieved from the files
  set<string> autoBlackListSet;
  vector<string> manualBlackListVec;
  //Main containers
  jp tableOfConcepts;
  jp tableOfEvents;
  KMeans<int> cluster(NTopics);
  //mapping containers
  map<string, int> nonEntityIdToClusterWeightIdMapping;
  vector<string> clusterWeightIdToNonEntityIdMappingVec;
  vector<string> eventsClusterItemIdToEventId;
  /*
  Output files:
  --------------------------------------------------------------------------
  Meta file: statistical info:
    Total events
    Total clustered events
    Total events with no non-entity non-filtered concepts
    Total filtered events from clustering
    Total concepts", totalConcepts
    UNIQUE filtered items by AUTO blacklist
    TOTAL filtered items by MANUAL blacklist
    UNIQUE filtered items by MANUAL blacklist
    Total location concepts
    Total entity concepts
    Total non-entity concepts
    UNIQUE non-entity concepts
  --------------------------------------------------------------------------
  cluster cloud data file: results_cloudX:

  Array of concepts info, [{title,score,link}]:

  -----------------------------------------------------------------------------
  Cluster events data file: results_eventsX:

  Object of existing concepts:
  {id->{concept->{title,type,uri,TotalAggregatedScore},events->[{id,score}]}}
    - ONLY the ones that existed as a concepts from the events
      chosen for that cluster

  Object of events in cluster:
  {id->{title,totalArticleCount,eventDate,concepts:{id->score}}
    - the events that are chosen for that cluster

  Array of non entity concepts ids, [id]:
    - represents the nodes array
  */
  //loading the blackList files into their containers
  auto blackListVec = jp(loadFile(autoBlackListFileName)).getNames();
  for (auto& it : blackListVec) {
    autoBlackListSet.insert(it);
  }
  LoadAppendedAsText(manualBlackListFilePath, manualBlackListVec);
  cout << "Auto blacklist size = " << autoBlackListSet.size() << endl;
  cout << "Manual blacklist size = " << manualBlackListVec.size() << endl;

  //reading events dumb files one by one
  for (int i = eventsFilesOffset; i < eventsFilesThreshold; ++i) {
    //getting the left-padded number from the index
    string idxFile = paddingnumber(i, 3);
    cout << "Processing file " << eventsFilesPath + idxFile + ".jsonl" << endl;
    ifstream fin(eventsFilesPath + idxFile + ".jsonl");
    //checking the file, if doesn't open, terminate the program
    if (!fin.is_open()) {
      cout << "file didn't open ";
      system("pause");
      return 0;
    }
    //otherwise, read the file line by line:
    string json;
    while (getline(fin, json)) {
      //each line represent a serialized event
      // convert it to json to extract info from it
      jp curEvent(json);
      ++totalEvents;
      if (totalEvents % 1000 == 0) {
        cout << "Processed "<<totalEvents << " Events so far..\n";
      }
      /*
      * -we will extract the informations we want from each event,
      *   and discard the rest
      * -for each event we will store the following information about it:
      *  id
      *  title
      *  uri
      *  totalArticleCount
      *  date
      *  list of concepts: for each one
      *		conceptId
      *		conceptScore: w.r.t this event
      */
      // getting basic info about the events
      string eventId = to_string(curEvent.getNumberAsLong("id"));
      /* handling non-english title case:
      * sometimes, the english title of an event doesn't exists
      * in this case we search for any non-english title and assign
      *   the variable eventTitle to it
      * if no title is found, assign eventTitle to the empty string
      */
      auto& eventTitleTemp = curEvent.loadJson("title");
      string eventTitle;
      if (jp::isValidType(eventTitleTemp.loadString("eng"))) {
        eventTitle = eventTitleTemp.getString("eng");
      } else if (eventTitleTemp.getNames().empty()) {
        eventTitle = "";
      } else {
        //get the string correpsonding to the first property name
        eventTitle = eventTitleTemp
          .getString(*eventTitleTemp.getNames().begin());
      }
      string eventUri = curEvent.getString("uri");
      int eventTotalArticleCount
        = static_cast<int>(curEvent.getNumber("totalArticleCount"));
      string eventDate = curEvent.getString("eventDate");
      //instantiating new event object and add the necessary info to it
      jp newEvent;
      newEvent.addEntity("title", eventTitle);
      newEvent.addEntity("uri", eventUri);
      newEvent.addEntity("totArtCnt", eventTotalArticleCount);
      newEvent.addEntity("date", eventDate);
      jp eventConcepts;
      vii singleEventWeightVector;
      auto& conceptsOfEvent = curEvent.loadArray("concepts");
      for (auto& singleConceptIt : conceptsOfEvent) {
        jp& singleConcept = jp::loadJson(singleConceptIt);
        ++totalConcepts;
        /*getting the info about the concepts,for each concept:
        * id
        * label
        * type
        * uri
        * score
        */
        string conceptId = singleConcept.getString("id");

        auto& conceptLabelTemp = singleConcept.loadJson("label");
        string conceptLabel;
        if (jp::isValidType(conceptLabelTemp.loadString("eng"))) {
          conceptLabel = conceptLabelTemp.getString("eng");
        } else if (conceptLabelTemp.getNames().empty()) {
          conceptLabel = "";
        } else {
          conceptLabel = conceptLabelTemp
            .getString(*conceptLabelTemp.getNames().begin());
        }
        string conceptType = singleConcept.getString("type");
        string conceptUri = singleConcept.getString("uri");
        //the wiki url is shorten to save some space
        conceptUri = shortenWiki(conceptUri);
        int conceptScore = static_cast<int>(singleConcept.getNumber("score"));
        // check if a concept is on the blacklist whether
        //    it's the manual or the auto one
        // if so keep record of the number of unique and total ones
        bool isStopWord = false;
        if (autoBlackListSet.find(conceptLabel) != autoBlackListSet.end()) {
          FilteredItemsByAutoBlackListSet.insert(conceptLabel);
          ++totalFilteredItemsByAutoBlackList;
          isStopWord = true;
        }
        //for manual blacklist, we're searching if the identified mask
        //  is included as substring of the title,
        //  not just exact matching
        for (auto singleMask : manualBlackListVec) {
          if (conceptLabel.find(singleMask) != conceptLabel.npos) {
            FilteredItemsByManualBlackListSet.insert(conceptLabel);
            ++totalFilteredItemsByManualBlackList;
            isStopWord = true;
            break;
          }
        }
        //if it's on the blacklist, don't add it to the events
        //  or to the table of concepts
        if (isStopWord) { continue; }
        if (conceptType == locationType) {
          ++totalLocationConcepts;
          continue;
        }
        //we only need to add the id of the concept
        //  and its score in that event.
        eventConcepts.addEntity(conceptId, conceptScore);
        //Store the concepts information in the table of concepts
        jp singleConceptNew;
        singleConceptNew.addEntity("title", conceptLabel);
        singleConceptNew.addEntity("type", conceptType);
        singleConceptNew.addEntity("uri", conceptUri);
        tableOfConcepts.addEntity(conceptId, singleConceptNew);

        //for non-entity concepts only:
        bool isNonEntity
          = nonEntityTypes.find(conceptType) != nonEntityTypes.end();
        if (!isNonEntity) {
          ++totalEntityConcepts;
          continue;
        }
        //=>check if the non-entity concept exists before,
        //  if not add it to the table for mapping
        if (nonEntityIdToClusterWeightIdMapping.find(conceptId)
          == nonEntityIdToClusterWeightIdMapping.end()) {

          nonEntityIdToClusterWeightIdMapping[conceptId]
            = UniqueNonEntityConceptsCounter;
          clusterWeightIdToNonEntityIdMappingVec.push_back(conceptId);
          UniqueNonEntityConceptsCounter++;
        }
        //add it to the features vector of the event
        singleEventWeightVector.push_back
        ({ nonEntityIdToClusterWeightIdMapping[conceptId],conceptScore });

        totalNonEntityConcepts++;
      }

      //after processing all the concepts, add them to the newEvent
      //  object, and add the later to the table of all events
      newEvent.addEntity("concepts", eventConcepts);
      if (singleEventWeightVector.empty()) {
        ++numberOfEmptyVectors;
      } else {
        //since events that does NOT have non-entity concepts are 
        //  not classified in the clusters, no need to store them
        tableOfEvents.addEntity(eventId, newEvent);
        cluster.addVector(singleEventWeightVector);
        eventsClusterItemIdToEventId.push_back(eventId);
        numberOfNonEmptyEvents++;
      }

    }
    fin.close();
  }
  cout << "Finished parsing\n\n\n";
  cout << "Clustering...\n";
  //cluster the events into topics
  auto clusteringResult = cluster.clustering(0);
  auto& clustersCenterInfo = clusteringResult.first;
  auto& eventsClusterId = clusteringResult.second;
  cout << "Finished clustering\n\n\n";
  //-------------------------------------------------------------------------------------

  //preparing output:
  //ensuring the directory exists
  ensureDirectory(outputDir);
  //first prepare the cloud files from the cluster centers 
  for (int Clustercounter = 0; Clustercounter < NTopics; ++Clustercounter) {
    auto singleClusterCenterVec = clustersCenterInfo[Clustercounter];
     string pathCloud
      = outputDir + characteristicsFileName + to_string(Clustercounter) + ".jsonl";

    ja clusterCloudData;
    for (int j = 0; j < singleClusterCenterVec.size(); ++j) {
      const long double featureWeight = singleClusterCenterVec[j];
      if (featureWeight > 0) {
        jp temp;
        string id = clusterWeightIdToNonEntityIdMappingVec[j];
        auto& curConcept = tableOfConcepts.loadJson(id);
        string& featureTitle = curConcept.loadString("title");
        string& featureUri = curConcept.loadString("uri");

        temp.addEntity("title", featureTitle);
        temp.addEntity("score", featureWeight);
        temp.addEntity("link", featureUri);
        clusterCloudData.addEntity(temp);
      }
    }
    saveFile(pathCloud, clusterCloudData.stringify());
  }
  cout << "Finished preparing cluster cloud data\n\n\n";

  //then classify the events into their files based on clustering results 
  vector<vector<string> > tableOfClusterEvents(NTopics);
  //add the classified events to the table of cluster events
  //some events will not be assigned to a cluster in the clustering algorithm
  //  due to being far from any of the centers
  const int n = static_cast<int>(eventsClusterId.size());
  for (int i = 0; i < n; ++i) {
    if (eventsClusterId[i] != -1) {
      tableOfClusterEvents[eventsClusterId[i]]
        .push_back(eventsClusterItemIdToEventId[i]);
      ++totalClusteredEvents;
    }
  }
  for (int clusterId = 0; clusterId < NTopics; ++clusterId) {
    /* for each cluster, the following will be added:
    *  a table of concepts that appeared in events belong to that cluster
    *  a table of events classified in that cluster
    *  a list of nodes representing the ids of the entities
    *    that appeared in clusters' events
    */
    /*jp clusterInfo;
    clusterInfo.addEntity("concepts", jp());
    clusterInfo.addEntity("events", jp());
    clusterInfo.addEntity("nodes", ja());
    jp& clusterConcepts = clusterInfo.loadJson("concepts");
    jp& clusterEvents = clusterInfo.loadJson("events");
    ja& nodesArray = clusterInfo.loadArray("nodes");
    */
    jp clusterConcepts;
    jp clusterEvents;
    ja nodesArray;
    for (auto& eventId : tableOfClusterEvents[clusterId]) {
      auto& curEvent = tableOfEvents.loadJson(eventId);
      auto& eventConcepts = curEvent.loadJson("concepts");
      clusterEvents.addEntity(eventId, curEvent);
      for (auto& conceptId : eventConcepts) {
        auto conceptScore = eventConcepts.getNumber(conceptId);
        if (!jp::isValidType(clusterConcepts.loadJson(conceptId))) {
          //concept is not added yet to cluster concepts,
          //  add the necessary info first
          //add a copy of the information from the concepts table
          jp newConcept;
          newConcept.addEntity("concept",
            tableOfConcepts.loadJson(conceptId));
          newConcept.addEntity("events", ja());
          clusterConcepts.addEntity(conceptId, newConcept);
          //if the concept is an entity add it to the list of nodes
          if (entityTypes.find(newConcept.loadJson("concept").getString("type"))
            != entityTypes.end()) {
            nodesArray.addEntity(conceptId);
          }
        }
        //adding the cur event to array of events belong to that concept
        jp tempCurEvent;
        tempCurEvent.addEntity("id", eventId);
        tempCurEvent.addEntity("score", conceptScore);
        clusterConcepts.loadJson(conceptId).loadArray("events")
          .addEntity(tempCurEvent);
      }
    }
    string pathEvents
      = outputDir + eventsFileName + to_string(clusterId) + ".jsonl";
    string pathConcepts
      = outputDir + conceptsFileName + to_string(clusterId) + ".jsonl";
    string pathNodes
      = outputDir + nodesFileName + to_string(clusterId) + ".jsonl";
    saveFile(pathEvents, clusterEvents.stringify());
    saveFile(pathConcepts, clusterConcepts.stringify());
    saveFile(pathNodes, nodesArray.stringify());
  }
  // Finally, output the meta info file, along with a summary on the console
  cout << "\n------------------------------------------------------------\n";
  cout << "Event summary\n";
  cout << "Total events = "
    << totalEvents << endl;
  cout << "Total clustered events = "
    << totalClusteredEvents << endl;
  cout << "Total events with no non-entity non-filtered concepts = "
    << numberOfEmptyVectors << endl;
  cout << "Total filtered events from clustering ="
    << totalEvents - numberOfEmptyVectors - totalClusteredEvents << endl;
  cout << "-------------------------------------------------------------\n";
  cout << "Concept summary\n";
  cout << "Total concepts = " << totalConcepts << endl;
  cout << "TOTAL filtered items by AUTO blacklist = "
    << totalFilteredItemsByAutoBlackList << endl;
  cout << "UNIQUE filtered items by AUTO blacklist = "
    << FilteredItemsByAutoBlackListSet.size() << endl;
  cout << "TOTAL filtered items by MANUAL blacklist = "
    << totalFilteredItemsByManualBlackList << endl;
  cout << "UNIQUE filtered items by MANUAL blacklist = "
    << FilteredItemsByManualBlackListSet.size() << endl;
  cout << "Total location concepts = "
    << totalLocationConcepts << endl;
  cout << "Total entity concepts(person-organization) = "
    << totalEntityConcepts << endl;
  cout << "Total non-entity concepts = "
    << totalNonEntityConcepts << endl;
  cout << "UNIQUE non-entity concepts = "
    << UniqueNonEntityConceptsCounter << endl;

  jp eventSummary, conceptSummary, metaInfo;
  eventSummary.addEntity("Total events",
    totalEvents);
  eventSummary.addEntity("Total clustered events",
    totalClusteredEvents);
  eventSummary.addEntity("Total events with no non-entity non-filtered concepts",
    numberOfEmptyVectors);
  eventSummary.addEntity("Total filtered events from clustering",
    totalEvents - numberOfEmptyVectors - totalClusteredEvents);
  conceptSummary.addEntity("Total concepts", totalConcepts);
  conceptSummary.addEntity("TOTAL filtered items by AUTO blacklist",
    totalFilteredItemsByAutoBlackList);
  conceptSummary.addEntity("UNIQUE filtered items by AUTO blacklist",
    static_cast<int>(FilteredItemsByAutoBlackListSet.size()));
  conceptSummary.addEntity("TOTAL filtered items by MANUAL blacklist",
    totalFilteredItemsByManualBlackList);
  conceptSummary.addEntity("UNIQUE filtered items by MANUAL blacklist",
    static_cast<int>(FilteredItemsByManualBlackListSet.size()));
  conceptSummary.addEntity("Total location concepts",
    totalLocationConcepts);
  conceptSummary.addEntity("Total entity concepts",
    totalEntityConcepts);
  conceptSummary.addEntity("Total non-entity concepts",
    totalNonEntityConcepts);
  conceptSummary.addEntity("UNIQUE non-entity concepts",
    UniqueNonEntityConceptsCounter);

  metaInfo.addEntity("Events summary", eventSummary);
  metaInfo.addEntity("Concepts summary", conceptSummary);
  string metaPath = outputDir + "meta.jsonl";
  saveFile(metaPath, metaInfo.stringifyFormatted());

  system("pause");
  return 0;
}