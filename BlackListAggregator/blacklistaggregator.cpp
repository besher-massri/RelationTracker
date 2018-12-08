#define _CRT_SECURE_NO_WARNINGS
#include <string>
#include <fstream>
#include "../Lib/kmeans.h"
#include "../Lib/jsonparser.cpp"
using ii = pair<int, int>;
using is = pair<int, string>;
using vii = vector<ii>;
using vi = vector<int>;
using jp = JsonParser;

string configPath = "../config.jsonl";
//parameters
string outputDir;
string articlesFilesPath;
string autoBlackListFileName;
int articlesFilesThreshold;
int articlesFilesOffset;

void loadConfigurations() {
  jp config(loadFile(configPath));
  outputDir =
    config.getString("outputDir");
  articlesFilesPath = config.getString("articlesFilesPath");
  autoBlackListFileName = config.getString("autoBlackListFileName");
  articlesFilesOffset = config.getNumberAsInt("articlesFilesOffset");
  articlesFilesThreshold = config.getNumberAsInt("articlesFilesThreshold");
}
bool comparator(const is& lhs, const is& rhs) {
  if (lhs.first == rhs.first) {
    return lhs.second < rhs.second;
  }
  return lhs.first > rhs.first;
}
int main() {
  /*
    This program will read number of articles from ER data,
     process their sources, which will be newspapers, news agencies,
     and add them to the blacklist file
  */
  loadConfigurations();
  //containers
  map<string, int> sources;
  //counters
  int articleCounter = 0;
  int totalPublishers = 0;

  for (int i = articlesFilesOffset; i < articlesFilesThreshold; ++i) {
    string idxFile = paddingnumber(i, 3);
    cout <<"Processing file:\t"<< articlesFilesPath + idxFile + ".jsonl" << endl;
    ifstream fin(articlesFilesPath + idxFile + ".jsonl");
    if (!fin.is_open()) {
      cout << "file didn't open\n";
      system("pause");
      return 0;
    }
    string json;
    while (getline(fin, json)) {
      ++articleCounter;
      if (articleCounter % 1000 == 0) {
        cout <<"Processed "<< articleCounter << " Articles so far..\n";
      }
      //extract the publishing agency if exists
      jp curArticle(json); 
      if (jp::isValidType(curArticle.loadJson("source")) &&
        jp::isValidType(curArticle.loadJson("source").loadString("title"))) {

        ++sources[curArticle.loadJson("source").loadString("title")];
        ++totalPublishers;
      }
    }
  }
  cout << "TOTAL sources = " << totalPublishers << endl;
  cout << "UNIQUE sources = " << sources.size() << endl;

  //store them in a vector to sort them DESC by occurrence
  vector<is>sourceVec;
  sourceVec.reserve(sources.size());
  for (auto& it : sources) {
    sourceVec.emplace_back(it.second,it.first);
  }
  sort(sourceVec.begin(), sourceVec.end(), comparator);
  JsonParser output;
  for (auto& k : sourceVec) {
    output.addEntity(k.second, new Number(k.first));
  }
  saveFile(outputDir + autoBlackListFileName, output.stringify());
  system("pause");
}