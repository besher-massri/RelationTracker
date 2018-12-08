#ifndef SERIALIZATION_H
#define SERIALIZATION_H

#include <iostream>
#include <utility>
#include <map>
#include <vector>
#include <string>
#include <set>
#include <fstream>
using std::ostream;
using std::istream;
using std::ifstream;
using std::ofstream;
using std::map;
using std::pair;
using std::vector;
using std::set;
using std::string;
using std::ios;

#pragma region Save
template <typename T>
static void Save(ostream& os, const T i) {
  os.write((const char*)& i, sizeof(i));
}
static void Save(ostream& os, const string& str) {
  int sz = static_cast<int>(str.length());
  Save(os, sz);
  os.write(str.c_str(), sizeof(char)*str.length());
}
template <typename T>
static void Save(ostream& os, const vector<T>& v) {

  int sz = static_cast<int>(v.size());
  Save(os, sz);
  for (const T& t : v) {
    Save(os, t);
  }
}
template <typename T>
static void Save(ostream& os, const set<T>& v) {
  int sz = static_cast<int>(v.size());
  Save(os, sz);
  for (const T& t : v) {
    Save(os, t);
  }
}
template <typename A, typename B>
static void Save(ostream& os, const pair<A, B>& v) {
  Save(os, v.first);
  Save(os, v.second);
}
template <typename K, typename V>
static void Save(ostream& os, const map<K, V>& v) {
  int sz = static_cast<int>(v.size());
  Save(os, sz);
  for (const auto& pr : v) {
    Save(os, pr);
  }
}
template <typename T>
void Save(const string& filePath, const T& v) {
  ofstream fout(filePath, ios::binary);
  if (!fout.is_open()) { return; }
  Save(fout, v);
  fout.close();
}
#pragma endregion

#pragma region SaveAsText
template<typename T>
static void SaveAsText(std::ostream& os, const T& i, char delim = '\n') {
  os << i << delim;
}
static void SaveAsText(ostream& os, const string& str, char delim = '\n') {
  //string encoded = encodeEscapeCharacters(str);
//	os << encoded.length() << " " << encoded << '\0' << delim;
  os << str << delim;
}
template <typename T>
static void SaveAsText(ostream& os, const vector<T>& v, char delim = '\n') {
  //need to handle the extra space
  SaveAsText(os, v.size(), delim);
  for (const T& t : v) {
    SaveAsText(os, t, delim);
  }
}
template <typename T>
static void SaveAsText(ostream& os, const set<T>& v, char delim = '\n') {
  SaveAsText(os, v.size(), delim);
  for (const T& t : v) {
    SaveAsText(os, t, delim);
  }
}
template <typename A, typename B>
static void SaveAsText(ostream& os, const pair<A, B>& v, char delim = '\n') {
  SaveAsText(os, v.first, delim);
  SaveAsText(os, v.second, delim);
}
template <typename K, typename V>
static void SaveAsText(ostream& os, const map<K, V>& v, char delim = '\n') {
  SaveAsText(os, v.size());
  for (const auto& pr : v) {
    SaveAsText(os, pr);
  }
}
template <typename T>
static bool SaveAsText(const string filePath, const T& v, char delim = '\n') {
  ofstream fout(filePath);
  if (!fout.is_open()) { return false; }
  SaveAsText(fout, v, delim);
  fout.close();
  return true;
}
#pragma endregion

#pragma region Load
template<typename T>
static void Load(istream& is, T& i) {
  is.read((char*)&i, sizeof(i));
}
static void Load(istream& is, string& str) {
  int n;
  Load(is, n);
  char *arr = new char[n + 1];
  //for (int i = 0; i < n; ++i){
  //Load(is, arr[i]);
  //}
  is.read(arr, sizeof(char)*n);
  arr[n] = '\0';
  str = arr;
  delete[] arr;
}
template <typename T>
static void Load(istream& is, vector<T>& v) {
  int n;
  Load(is, n);
  v.resize(n);
  for (T& t : v) {
    Load(is, t);
  }
}
template <typename T>
static void Load(istream& is, set<T>& v) {
  int n;
  Load(is, n);
  while (n--) {
    T el;
    Load(is, el);
    v.insert(el);
  }
}
template <typename A, typename B>
static void Load(istream& is, pair<A, B>& v) {
  Load(is, v.first);
  Load(is, v.second);
}
template <typename K, typename V>
static void Load(istream& is, map<K, V>& v) {
  int n;
  Load(is, n);
  while (n--) {
    pair<K, V> el;
    Load(is, el);
    v.insert(el);
  }
}
template <typename T>
void Load(const string& filePath, T& v) {
  ifstream fin(filePath, ios::binary);
  if (!fin.is_open()) { return; }
  Load(fin, v);
  fin.close();
}
#pragma endregion

#pragma region LoadAsText
template<typename T>
static void LoadAsText(istream& is, T& i) {
  is >> i;
  is.get();
}
static void LoadAsText(istream& is, char& i) {
  is >> i;
}
static void LoadAsText(istream& is, string& str) {
  //int n;
  //is >> n;
  //char *arr = new char[n + 1];
  ////for (int i = 0; i < n; ++i){
  ////Load(is, arr[i]);
  ////}
  //is.getline(arr, n, '\0');
  //arr[n] = '\0';
  //str = arr;
  //delete[] arr;
  //is >> str;
  getline(is, str);
  //str = decodeEscapeCharacters(str);
}
template <typename T>
static void LoadAsText(istream& is, vector<T>& v) {
  int n;
  LoadAsText(is, n);
  v.resize(n);
  for (T& t : v) {
    LoadAsText(is, t);
  }
}
template <typename T>
static void LoadAsText(istream& is, set<T>& v) {
  int n;
  LoadAsText(is, n);
  while (n--) {
    T el;
    LoadAsText(is, el);
    v.insert(el);
  }
}
template <typename A, typename B>
static void LoadAsText(istream& is, pair<A, B>& v) {
  LoadAsText(is, v.first);
  LoadAsText(is, v.second);

}
template <typename K, typename V>
static void LoadAsText(istream& is, map<K, V>& v) {
  int n;
  LoadAsText(is, n);
  while (n--) {
    pair<K, V> el;
    LoadAsText(is, el);
    v.insert(el);
  }
}
template <typename T>
bool LoadAsText(const string& filePath, T& v) {
  ifstream fin(filePath);
  if (!fin.is_open()) { return false; }
  LoadAsText(fin, v);
  fin.close();
  return true;
}
#pragma endregion

#pragma region LoadAppendedAsText
template <typename T>
int LoadAppendedAsText(const string& filePath, vector<T>& v) {
  ifstream fin(filePath);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    T temp;
    LoadAsText(fin, temp);
    v.push_back(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
template <typename T>
int LoadAppendedAsText(const string& filePath, set<T>& v) {
  ifstream fin(filePath);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    T temp;
    LoadAsText(fin, temp);
    v.insert(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
template <typename K, typename V>
int LoadAppendedAsText(const string& filePath, map<K, V>& v) {
  ifstream fin(filePath);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    pair<K, V> temp;
    LoadAsText(fin, temp);
    v.insert(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
#pragma endregion

#pragma region LoadAppended

template <typename T>
int LoadAppended(const string& filePath, vector<T>& v) {
  ifstream fin(filePath, ios::binary);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    T temp;
    Load(fin, temp);
    v.push_back(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
template <typename T>
int LoadAppended(const string& filePath, set<T>& v) {
  ifstream fin(filePath, ios::binary);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    T temp;
    Load(fin, temp);
    v.insert(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
template <typename K, typename V>
int LoadAppended(const string& filePath, map<K, V>& v) {
  ifstream fin(filePath, ios::binary);
  if (!fin.is_open()) { return -1; }
  int counter = 0;
  while (fin.peek() != EOF) {
    pair<K, V> temp;
    Load(fin, temp);
    v.insert(temp);
    ++counter;
  }
  fin.close();
  return counter;
}
#pragma endregion
#endif // SERIALIZATION_H