#ifndef KMEANS_H
#define KMEANS_H 
#define _CRT_SECURE_NO_WARNINGS
#include <vector>
#include <cmath>
#include <algorithm>
#include "jsonparser.h"
using std::cerr;
static long double eps = 0;

template <typename Type> class KMeans {
  typedef pair<int, Type> ii;
  typedef vector<ii> vii;
  typedef vector<vii> vvii;
  typedef vector<Type> vt;
  typedef vector<vt> vvt;
  typedef vector<int> vi;
  typedef long double ld;
  typedef vector<ld> vld;
  typedef vector<vld> vvld;
  typedef JsonParser jp;

private:
  int KConstant;
  int dimension;
  vvii vectors;
  vvld clusterCenters;
  vi vectorsId; // ID of the cluster of each vector
  vld vectorsDis; // distance from the cluster mean of each vector
  vi vectorsTempId;
  vld cardinalityOfItems;
  vld cardinalityOfClusters;

private:
  ld cardinality(const vii& v) {
    ld res = 0;
    for (auto& k : v)
      res += k.second*k.second;
    return sqrt(res);
  }
  ld cardinality(const vt& v) {
    ld res = 0;
    for (auto& k : v)
      res += k * k;
    return sqrt(res);
  }
  ld cardinality(const vld& v) {
    ld res = 0;
    for (auto& k : v) {
      res += k * k;
    }
    return sqrt(res);
  }

  int assignVectors(ld threshold = 0) {
    const int numOfVectors = static_cast<int>(vectors.size());
    ld curCardClus, val, temp;
    int counterVec = 0, counterClus = 0;
    for (auto& k : vectorsTempId) {
      k = -1;
    }
    for (auto& k : vectorsDis) {
      k = -1;
    }
    for (const auto& curCluster : clusterCenters) {
      curCardClus = cardinalityOfClusters[counterClus];
      counterVec = 0;
      for (const auto& curVector : vectors) {
        val = curCardClus * cardinalityOfItems[counterVec];
        long double& mnDis = vectorsDis[counterVec];
        int& mnIdx = vectorsTempId[counterVec];
        temp = 0;
        for (const auto& k : curVector) {
          temp += k.second*curCluster[k.first];
        }
        temp = temp / (val ? val : 1);
        if (temp >= threshold) {
          if (mnIdx == -1 || temp > mnDis) {
            mnDis = temp;
            mnIdx = counterClus;
          }
        }
        ++counterVec;
      }
      ++counterClus;
    }
    int changes = 0;
    for (int i = 0; i < numOfVectors; ++i) {
      if (vectorsId[i] != vectorsTempId[i]) {
        changes++;
        vectorsId[i] = vectorsTempId[i];
        if (vectorsDis[i] == 0) {
          cerr << "Error\n";
        }
      }
    }
    return changes;
  }

  template <class T>
  static bool comparator(const T& a, const T& b,
    bool checkOnlyEquality = false) {
    int n =static_cast<int>(a.size());
    int i = 0;
    while (i < n && abs(a[i] - b[i]) <= eps) {
      ++i;
    }
    if (checkOnlyEquality) { return i == n; }
    if (i == n) { return &a < &b; }
    return a[i] < b[i];

  }

  bool calcMeanOfClusters() {
    vvld  newCenters(KConstant);
    for (auto& k : newCenters) {
      k = vld(dimension, 0);
    }
    int numOfVectors = static_cast<int>(vectors.size());
    vi numberOfItemsInClusters(KConstant);
    for (int i = 0; i < numOfVectors; ++i) {
      int id = vectorsId[i];
      if (id == -1) { continue; }
      for (auto& k : vectors[i]) {
        newCenters[id][k.first] += k.second;
      }
      numberOfItemsInClusters[id]++;
    }
    for (int i = 0; i < KConstant; ++i) {
      int q = numberOfItemsInClusters[i];
      if (q == 0) { continue; }
      for (auto& k : newCenters[i]) {
        k = k / q;
      }
    }
    bool isEqual = true;
    int i;
    for (i = 0; i < KConstant && isEqual; ++i) {
      isEqual &= comparator(newCenters[i], clusterCenters[i], true);
    }

    if (!isEqual) {
      clusterCenters = std::move(newCenters);
      for (int i = 0; i < KConstant; ++i) {
        cardinalityOfClusters[i] = cardinality(clusterCenters[i]);
      }
      return true;
    }
    return false;
  }

  Array convertSingleVectorToArray(vi& el) {
    Array arr;
    for (auto& k : el) {
      arr.addEntity(k);
    }
    return arr;
  }
  Array converPairVectortToArray(vii& el) {
    Array arr;
    for (auto& k : el) {
      jp pairElement;
      pairElement.addEntity("ID", to_string(k.first));
      pairElement.addEntity("Value", k.second);
      arr.addEntity(pairElement);
    }
    return arr;
  }
  Array converPairVectortToArray(vvii& el) {
    Array arr;
    for (auto& k : el) {
      arr.addEntity(converPairVectortToArray(k));
    }
    return arr;
  }
  Array converPairVectortToArray(vvt& el) {
    Array arr;
    for (auto& k : el) {
      vii temp;
      for (int i = 0; i < k.size(); ++i) {
        temp.push_back(ii(i, k[i]));
      }
      arr.addEntity(converPairVectortToArray(temp));
    }
    return arr;
  }

public:
  KMeans(int constantK) :KConstant(constantK) {}

  int getKConstant() const {
    return KConstant;
  }
  void setKConstant(int KConstant) {
    KMeans::KConstant = KConstant;
  }
  void addVector(const vii& v) {
    vii sortedVector = v;
    sort(sortedVector.begin(), sortedVector.end());
    vectors.push_back(sortedVector);
  }
  bool popVector() {
    if (vectors.empty()) { return false; }
    vectors.pop_back();
    return true;
  }
  pair<vvld, vi> clustering(ld accuracyThreshold = 0) {
    const int maximumNumberOfSteps =static_cast<int>(log(vectors.size()) * 4);
    // prepare the cluster arrays
    const int numOfVectors =static_cast<int>(vectors.size());
    if (KConstant > numOfVectors) {
      cerr << "Can't cluster the items into more than their number of \
        clusters!!!\n\n";
      return { { {} },{} }; //essentially empty obj of the returned type
    }
    //vector<pair<VVT, VI> > results;
    // calculate the dimension
    dimension = 1;
    for (auto& k : vectors) {
      dimension = max(dimension, k.back().first + 1);
    }
    cardinalityOfItems.clear();
    cardinalityOfItems.reserve(numOfVectors);
    cardinalityOfClusters.clear();
    cardinalityOfClusters.reserve(KConstant);
    vectorsId.clear();
    vectorsId.resize(numOfVectors);
    vectorsDis.clear();
    vectorsDis.resize(numOfVectors);
    vectorsTempId.clear();
    vectorsTempId.resize(numOfVectors);
    clusterCenters.clear();
    clusterCenters.resize(KConstant);
    for (auto& k : clusterCenters) {
      k = vld(dimension, 0);
    }
    // pre-calculate the cardinality of the items, since they don't change
    for (auto& k : vectors) {
      cardinalityOfItems.push_back(cardinality(k));
    }
    vi id(numOfVectors);
    for (int i = 0; i < numOfVectors; ++i) {
      id[i] = i;
    }
    random_shuffle(id.begin(), id.begin() + numOfVectors);
    for (int i = 0; i < KConstant; ++i) {
      for (auto& k : vectors[id[i]]) {
        clusterCenters[i][k.first] = k.second;
      }
    }
    for (auto& k : clusterCenters) {
      cardinalityOfClusters.push_back(cardinality(k));
    }
    int steps = 1;
    int changes;
    do {
      changes = assignVectors();
    //  cout << "Number of assignment changes is " << changes << "\n";
      //	results.push_back(make_pair(clusterCenters, vectorsId));
      cout << "Step number " << steps++ << endl;

    } while (calcMeanOfClusters() && changes && steps <= maximumNumberOfSteps);
    assignVectors(accuracyThreshold);
    //if you want calculate the centroid vectors again 
    //  after the discarding the far vectors, uncomment this
    //calcMeanOfClusters(); 
    return { clusterCenters,vectorsId };
  }

  JsonParser clusteringAsJson(ld accuracyThreshold = 0) {
    auto res = clustering(accuracyThreshold);
    jp finalResult("{}");
    finalResult.addEntity("items", converPairVectortToArray(vectors));
    finalResult.addEntity("centers", converPairVectortToArray(res.first));
    finalResult.addEntity("IDs", convertSingleVectorToArray(res.second));
    return finalResult;
  }

  /*
  * format the clusters as JSON objects
  * the first step is the initial random set of setting means of clusters
  */
  /*this version returns all the steps*/
  JsonParser clusteringAsJsonFullSteps(ld accuracyThreshold = 0) {
    jp finalResult("{}");
    finalResult.addEntity("items", converPairVectortToArray(vectors));
    auto res = clustering(accuracyThreshold);
    Array totalArray;
    for (auto& oneResult : res) {
      jp oneStep;
      //converPairVectortToArray(oneResult.first);
      oneStep.addEntity("centers", converPairVectortToArray(oneResult.first));
      oneStep.addEntity("IDs", convertSingleVectorToArray(oneResult.second));
      totalArray.addEntity(oneStep);
    }
    finalResult.addEntity("stepsOfClustering", totalArray);
    return finalResult;
  }
};

#endif //KMEANS_H
