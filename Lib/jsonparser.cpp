#pragma once
#define _CRT_SECURE_NO_WARNINGS
#include "jsonparser.h"
using std::min;
using std::istringstream;
using std::ostringstream;
using std::regex;
using std::pair;
using std::cerr;
using std::max;
using std::make_pair;
using std::to_string;


Entity* Entity::clone() const {
  auto el = new Entity('n');
  *el = *this;
  return el;
}

void Entity::stringify(string& res)  const {
  res += "null";
}
void Entity::stringifyFormatted(string& res, string tabs)  const {
  stringify(res);
}
string Entity::stringify() const {
  string res = "";
  stringify(res);
  return res;
}
string Entity::stringifyFormatted()  const {
  string res = "";
  stringifyFormatted(res, "");
  return res;
}


//Boolean member methods
void Boolean::stringify(string& res)  const {
  res += element ? "true" : "false";
}
void Boolean::stringifyFormatted(string& res, string tab)  const {
  stringify(res);
}

Entity* Boolean::clone() const {
  auto el = new Boolean();
  *el = *this;
  return el;
}

const bool& Boolean::getBoolean() const {
  return element;
}

bool& Boolean::loadBoolean() {
  return element;
}

string Boolean::stringify()  const {
  string res = "";
  stringify(res);
  return res;
}
string Boolean::stringifyFormatted()  const {
  string res = "";
  stringifyFormatted(res, "");
  return res;
}

//String member methods
void String::stringify(string& res)  const {
  res += "\"" + encodeEscapeCharacters(element) + "\"";
}
void String::stringifyFormatted(string& res, string tab) const {
  stringify(res);
}

String::String(const string& el, bool decode) : Entity('s'),
element(decode ? decodeEscapeCharacters(el) : el) {
  element.shrink_to_fit();
}

Entity* String::clone() const {
  auto el = new String();
  *el = *this;
  return el;
}

string String::stringify()  const {
  string res = "";
  stringify(res);
  return res;
}
string String::stringifyFormatted() const {
  string res = "";
  stringifyFormatted(res, "");
  return res;
}

//Number member methods
void Number::stringify(string& res)  const {
  if (((long long)element) == element) {
    res += to_string((long long)element);
  } else {
    ostringstream str;
    str << std::fixed << std::setprecision(precision) << element;
    res += str.str();
  }
}
void Number::stringifyFormatted(string& res, string tabs)  const {
  stringify(res);
}

Entity* Number::clone() const {
  auto el = new Number();
  *el = *this;
  return el;
}

const NUMBER & Number::getNumber() const {
  return element;
}
long long Number::getNumberAsLong() const {
  return static_cast<long long>(element);
}
int Number::getNumberAsInt() const {
  return static_cast<int>(element);
}
NUMBER & Number::loadNumber() { return element; }
string Number::stringify()  const {
  string res = "";
  stringify(res);
  return res;
}
string Number::stringifyFormatted() const {
  string res = "";
  stringifyFormatted(res, "");
  return res; 
}


//Array member methods
Entity*& Array::operator [](int idx) {
  return elements[idx];
}
Entity* const& Array::operator [](int idx) const {
  return elements.at(idx);
}
void Array::stringify(string& res) const {
  res += "[";
  bool first = true;
  for (auto& k : elements) {
    if (!first) {
      res += ",";
    }
    first = false;
    k->stringify(res);

  }
  res += "]";
}
void Array::stringifyFormatted(string& res, string tabs)  const {
  res += "[\n";
  bool first = true;
  for (auto& k : elements) {
    if (!first) {
      res += ",\n";
    }
    first = false;
    res += tabs + "\t";
    k->stringifyFormatted(res, tabs + "\t");

  }
  res += "\n";
  res += tabs + "]";
}

Entity* Array::clone() const {
  auto el = new Array();
  *el = *this;
  return el;
}

void Array::deleteResources() {

  for (auto& it : elements) {
    delete it;
  }
  elements.clear();
}
inline void Array::deepCopyItem(const Entity *it) {
  elements.push_back(it->clone());
}
void Array::deepCopy(const Array& obj) {
  for (auto& it : obj.elements) {
    deepCopyItem(it);
  }
}
Array::Array(const vector<string>& el) : Entity('a') {
  elements.clear();
  for (auto it : el) {
    elements.push_back(new String(it));
  }
}

Array::Array(const vector<int>& el) : Entity('a') {
  elements.clear();
  for (auto it : el) {
    elements.push_back(new Number(it));
  }
}
template<typename T>
Array::Array(const vector<T>& el) : Entity('a') {
  elements.clear();
  for (auto it : el) {
    addEntity(el);
  }
}
Array::Array(const Array& obj) :Entity('a') {
  deepCopy(obj);
}
const vector<Entity*>& Array::getArray() const { return elements; }
vector<Entity*>& Array::loadArray() { return elements; }
void Array::addEntity(Entity * el) { elements.push_back(el); }
void Array::addEntity(const char * el) { elements.push_back(new String(el)); }
void Array::addEntity(const string & el) { elements.push_back(new String(el)); }
void Array::addEntity(const bool & el) { elements.push_back(new Boolean(el)); }
void Array::addEntity(const int & el) { elements.push_back(new Number(el)); }
void Array::addEntity(const NUMBER & el) { elements.push_back(new Number(el)); }
void Array::addEntity(long double el) { elements.push_back(new Number(el)); }
void Array::addEntity(const JsonParser & el) { elements.push_back(el.clone()); }
void Array::addEntity(const Array & el) { elements.push_back(new Array(el)); }
int Array::length() const { return static_cast<int>(elements.size()); }
int Array::size() { return static_cast<int>(elements.size()); }
Array& Array::operator=(const Array& obj) {
  if (this == &obj) {
    return *this;
  }
  deleteResources();
  deepCopy(obj);
  return *this;
}
void Array::concat(const Array * v) {
  auto vec = v->getArray();
  for (auto& it : vec) {
    this->elements.push_back(it);
  }
}
Array::~Array() {
  deleteResources();
}
Array::iterator Array::begin() noexcept { return elements.begin(); }
Array::const_iterator Array::cbegin() const noexcept { return elements.cbegin(); }
Array::iterator Array::end() noexcept { return elements.end(); }
Array::const_iterator Array::cend() const noexcept { return elements.cend(); }
string Array::stringify()  const {
  string res = "";
  stringify(res);
  return res;
}
string Array::stringifyFormatted() const {
  string res = "";
  stringifyFormatted(res, "");
  return res;
}

//Array friends methods
ostream& operator<<(ostream& out, Array& arr) {
  out << arr.stringify();
  return out;
}

//JsonParser static member variables
Entity* JsonParser::dummy;
JsonParser::resType JsonParser::failResult = resType(-1, dummy);
JsonParser JsonParser::invalidJson;
Array JsonParser::invalidJsonArray;
string JsonParser::invalidJsonString;
NUMBER JsonParser::invalidJsonNumber;
bool JsonParser::invalidJsonBool;

//JsonParser member methods
bool JsonParser::isSpecialCharacter(char c) {
  return !isalnum(c) && c != '+' && c != '-' && c != '.';
}
/*
* returns endIdx if not found
*/
int JsonParser::getNextSpecialCharacter(const string& json, int idx,
  int endIdx) {
  while (idx < endIdx && !isSpecialCharacter(json[idx])) {
    ++idx;
  }
  return idx;
}
/*
* it support that you can put the other type of quotation without putting \ behind it
*
* returns the index of the end quotation, or endIdx
*/
int JsonParser::getClosingQuotation(const string& json, int idx,
  char quotation, int endIdx) {
  char begIdx = idx;
  ++idx;
  bool specialCharacter = false; // case if \ + sth
  while (idx < endIdx && (json[idx] != quotation || specialCharacter)) {
    if (json[idx] == '\\') {
      specialCharacter = !specialCharacter;
    } else {
      specialCharacter = false;
    }
    /*
    it maintain the following cases:
    - \ then normal chr => true then false
    - \ then \ => true then false
    - \ then " => true then effective
    - \ then \ then " => true then false then NOT EFFECTIVE
    */
    ++idx;
  }
  return min(idx, endIdx);
}
// the string is within the interval [startIndex,endIdx)
JsonParser::JsonParser(string _json) :Entity('o') {
  int idx = 0;
  //int endIdx = json.length();
  string json = deleteSpaces(_json);
  int endIdx = static_cast<int>(json.length());
  processJson(json, 0, endIdx);
}
JsonParser::JsonParser(const JsonParser& obj) :Entity('o') {
  deepCopy(obj);
}
JsonParser& JsonParser::operator=(const JsonParser& obj) {
  if (this == &obj) { return *this; }
  deleteResources();
  deepCopy(obj);
  return *this;
}
JsonParser::resType JsonParser::processArray(const string& json, int idx, int endIdx) {
  //skipping the '['
  ++idx;
  auto *arr = new Array();
  while (idx < endIdx && json[idx] != ']') {
    resType result = processValue(json, idx, endIdx);
    if (result.first == -1) { return result; }//fail

    arr->addEntity(result.second);
    idx = result.first;

    // handle the case of , or end of object
    char c = json[idx];
    if (idx != endIdx && c != ']') {
      if (c != ',') {
        cerr << "Json Processing Error: in array processing expected ','\n";
        return failResult;
      }
      //skipping ','
      ++idx;
    }
  }
  // idx+1 to skip ']'
  return { idx + 1, arr };
}
JsonParser::resType JsonParser::processObj(const string& json, int idx, int endIdx) {
  JsonParser *element = new JsonParser();
  int nextJson = element->processJson(json, idx, endIdx);
  if (nextJson == -1) { return failResult; }
  return make_pair(nextJson, element);
}
JsonParser::resType JsonParser::processValue(const string& json, int idx, int endIdx) {
  char c = json[idx];
  if (c == '[') {// array case
    return processArray(json, idx, endIdx);
  } else if (c == '{') {
    return processObj(json, idx, endIdx);
  } else if (c == '\"') {
    int close = getClosingQuotation(json, idx, c, endIdx);
    // ==> close = "  or close=endIdx
    if (close == endIdx) { return failResult; }
    Entity *value = new String(json.substr(idx + 1, close - idx - 1), true);
    return make_pair(close + 1, value);
  } else {
    int close = getNextSpecialCharacter(json, idx, endIdx);
    string value = json.substr(idx, close - idx);
    int len = static_cast<int>(value.length());
    if (value == "null") {
      return make_pair(close, new Entity('n'));
    }
    if (value == "true" || value == "false") {
      Entity *element = new Boolean(value == "true");
      return make_pair(close, element);
    }
    regex numberFormat(R"([+-]?\d+\.?\d*([eE][+-]?\d+)?)");
    if (std::regex_match(value.c_str(), numberFormat)) {
      int posE = len, posDot = len;
      for (int i = 0; i < len && (posE == len || posDot == len); ++i) {
        if (value[i] == 'e' || value[i] == 'E') {
          posE = i;
        } else if (value[i] == '.') {
          posDot = i;
        }
      }
      istringstream in(value);
      int precision = max(0, posE - posDot - 1);
      NUMBER v;
      in >> v;
      Entity *element = new Number(v, precision);
      return make_pair(close, element);
    }
    return failResult;
  }
}
void JsonParser::stringify(string& res)const {
  res += "{";
  bool first = true;
  for (auto& name : names) {
    auto el = identifier.at(name);
    if (!first) {
      res += ",";
    }
    first = false;
    res += "\"" + encodeEscapeCharacters(name) + "\":";
    el->stringify(res);
  }
  res += "}";
}
void JsonParser::stringifyFormatted(string& res, string tabs) const {
  res += "{\n";
  bool first = true;
  for (auto& name : names) {
    auto el = identifier.at(name);
    if (!first) {
      res += ",\n";
    }
    first = false;
    res += tabs + '\t';
    res += "\"" + name + "\":";
    res += " ";
    el->stringifyFormatted(res, tabs + "\t");
  }
  res += "\n";
  res += tabs;
  res += "}";
}
inline void JsonParser::deleteResources() {
  for (auto& it : identifier) {
    /*
    's': string
    * 'o' : object
    * 'd' : number
    * 'a' : array
    * 'b' : boolean
    * 'n' : null
    */
    delete it.second;
  }
  identifier.clear();
  names.clear();
}
inline void JsonParser::deepCopyItem(const string& name, const Entity *it) {
  identifier[name] = it->clone();

  names.push_back(name);
}
void JsonParser::deepCopy(const JsonParser& obj) {
  for (auto& it : obj.identifier) {
    const Entity *temp = it.second;
    deepCopyItem(it.first, temp);
  }
}
int JsonParser::processJson(const string& json, int idx, int endIdx) {
  if (json[idx] != '{') { return -1; }
  // skipping  {
  ++idx;
  char c;
  while (idx < endIdx && (c = json[idx]) != '}') {
    //first get the name
    if (c != '\"') { return -1; }
    int close = getClosingQuotation(json, idx, c, endIdx);
    if (close == endIdx) { return -1; }
    //get the name and check if it already exists
    string name = json.substr(idx + 1, close - idx - 1);
    //decode the name
    name = decodeEscapeCharacters(name);
    if (identifier.find(name) != identifier.end()) {
      cerr << "Json Processing Error: repeated name of variable/array/object\n";
      return -1;
    }
    // now searching for ':'
    // close +1 for skipping '"'
    idx = close + 1;
    if (json[idx] != ':') {
      cerr << "Json Processing Error: missing ':' idx = " +
        to_string(idx) + "\n";
      return -1;
    }
    // skipping :
    ++idx;
    resType result = processValue(json, idx, endIdx);
    if (result.first == -1) {
      delete result.second;
      return -1;
    }
    identifier[name] = result.second;
    names.push_back(name);
    idx = result.first;
    // handle the case of , or end of object
    c = json[idx];
    if (idx != endIdx && c != '}') {
      if (c != ',') {
        cerr << "Json Processing Error: expected ','\n";
        return -1;
      }
      //skipping ','
      ++idx;
    }
  }
  // json +1 to skip '}'
  return idx + 1;
}
string JsonParser::deleteSpaces(const string& rhs) {

  bool isString = false;
  char chosenChar = '1';
  int n = static_cast<int>(rhs.length());
  string res;
  int counter = 0;
  bool specialCharacter = false;
  for (int i = 0; i < n; ++i) {
    char c = rhs[i];
    if (!isString && (c == '\"') && !specialCharacter) {
      isString = true, chosenChar = c;
    } else if (isString && (c == chosenChar) && !specialCharacter) {
      isString = false;
    }
    if (c == '\\') {
      specialCharacter = !specialCharacter;
    } else {
      specialCharacter = false;
    }
    // check the comments in getClosingQuotation function

    if (isString || (c != ' ' && c != '\n' && c != '\r' && c != '\t')) {
      res += c;
    }
  }
  return res;
}
bool JsonParser::addEntity(const string& name, const Entity *obj) {
  if (identifier.find(name) != identifier.end()) { return false; }
  deepCopyItem(name, obj);
  return true;
}
bool JsonParser::addEntity(const string& name, const JsonParser& obj) {
  return addEntity(name, &obj);
}
bool JsonParser::addEntity(const string& name, const Array& obj) {
  return addEntity(name, &obj);
}
bool JsonParser::addEntity(const string& name, const string& value) {
  return addEntity(name, new String(value));
}
bool JsonParser::addEntity(const string& name, const char *value) {
  return addEntity(name, new String(value));
}
bool JsonParser::addEntity(const string& name, const bool& value) {
  return addEntity(name, new Boolean(value));
}
bool JsonParser::addEntity(const string& name, const NUMBER value) {
  return addEntity(name, new Number(value));
}
bool JsonParser::addEntity(const string& name, const int& value) {
  return addEntity(name, new Number(value));
}
bool JsonParser::addEntity(const string& name, const double& value) {
  return addEntity(name, new Number(value));
}
bool JsonParser::addEntity(const string& name, const float& value) {
  return addEntity(name, new Number(value));
}
template<typename T>
bool JsonParser::addEntity(const string& name, const vector<T>& value) {
  static_assert(std::is_convertible<T, NUMBER>::value ||
    std::is_same<string, T>::value ||
    std::is_same<bool, T>::value,
    "T must be either numerical, string, or boolean");
  return addEntity(name, new Array(value));
}
string JsonParser::stringify() const {
  string res = "";
  stringify(res);
  return res;
}
string JsonParser::stringifyFormatted() const {
  string res = "";
  stringifyFormatted(res, "");
  return res;
}
const map<string, Entity*>& JsonParser::getData() {
  return identifier;
}
const vector<string>& JsonParser::getNames() {
  return names;
}
JsonParser::iterator JsonParser::begin() noexcept { return names.begin(); }
JsonParser::const_iterator JsonParser::cbegin() const noexcept { return names.cbegin(); }
JsonParser::iterator JsonParser::end() noexcept { return names.end(); }
JsonParser::const_iterator JsonParser::cend() const noexcept { return names.cend(); }
string& JsonParser::loadString(Entity *entity) {
  return static_cast<String*>(entity)->loadString();
}
bool& JsonParser::loadBoolean(Entity *entity) {
  return static_cast<Boolean*>(entity)->loadBoolean();
}
NUMBER& JsonParser::loadNumber(Entity *entity) {
  return static_cast<Number*>(entity)->loadNumber();
}
JsonParser& JsonParser::loadJson(Entity *entity) {
  return *static_cast<JsonParser*>(entity);
}
Array& JsonParser::loadArray(Entity *entity) {
  return *static_cast<Array*>(entity);
}
const string& JsonParser::getString(const Entity *entity) {
  return static_cast<const String*>(entity)->getString();
}
const bool& JsonParser::getBoolean(const Entity  *entity) {
  return static_cast<const Boolean*>(entity)->getBoolean();
}
const NUMBER& JsonParser::getNumber(const Entity *entity) {
  return static_cast<const Number*>(entity)->getNumber();
}
long long JsonParser::getNumberAsLong(const Entity *entity) {
  return static_cast<const Number*>(entity)->getNumberAsLong();
}
const JsonParser & JsonParser::getJson(const Entity *entity) {
  return *static_cast<const JsonParser*>(entity);
}
const Array& JsonParser::getArray(const Entity  *entity) {
  return *static_cast<const Array*>(entity);
}
//only used with references
bool JsonParser::isValidType(const string& el) {
  return &el != &invalidJsonString;
}
//only used with references
bool JsonParser::isValidType(const NUMBER& el) {
  return &el != &invalidJsonNumber;
}
//only used with references
bool JsonParser::isValidType(const bool& el) {
  return &el != &invalidJsonBool;
}
//only used with references
bool JsonParser::isValidType(const JsonParser& el) {
  return &el != &invalidJson;
}
//only used with references
bool JsonParser::isValidType(const Array& el) {
  return &el != &invalidJsonArray;
}
string& JsonParser::loadString(const string& entityName) {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonString;
  }
  return static_cast<String*>(identifier.at(entityName))->loadString();
}
bool& JsonParser::loadBoolean(const string& entityName) {

  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonBool;
  }
  return static_cast<Boolean*>(identifier.at(entityName))->loadBoolean();
}
NUMBER& JsonParser::loadNumber(const string& entityName) {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonNumber;
  }
  return static_cast<Number*>(identifier.at(entityName))->loadNumber();
}
JsonParser& JsonParser::loadJson(const string& entityName) {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJson;
  }
  return *static_cast<JsonParser*>(identifier.at(entityName));
}
Array& JsonParser::loadArray(const string& entityName) {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonArray;
  }
  return *static_cast<Array*>(identifier.at(entityName));
}
const string& JsonParser::getString(const string& entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonString;
  }
  return static_cast<String*>(identifier.at(entityName))->getString();
}
const bool& JsonParser::getBoolean(const string& entityName) const {

  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonBool;
  }
  return static_cast<Boolean*>(identifier.at(entityName))->getBoolean();
}
const NUMBER& JsonParser::getNumber(const string& entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonNumber;
  }
  return static_cast<Number*>(identifier.at(entityName))->getNumber();
}
long long JsonParser::getNumberAsLong(const string & entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return static_cast<long long> (invalidJsonNumber);
  }
  return static_cast<Number*>(identifier.at(entityName))->getNumberAsLong();
}
int JsonParser::getNumberAsInt(const string & entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return static_cast<int> (invalidJsonNumber);
  }
  return static_cast<Number*>(identifier.at(entityName))->getNumberAsInt();
}
const JsonParser& JsonParser::getJson(const string& entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJson;
  }
  return *static_cast<JsonParser*>(identifier.at(entityName));
}
const Array& JsonParser::getArray(const string& entityName) const {
  if (identifier.find(entityName) == identifier.end()) {
    return invalidJsonArray;
  }
  return *static_cast<Array*>(identifier.at(entityName));
}
char JsonParser::getType(const string& entityName)const {
  if (identifier.find(entityName) == identifier.end()) {
    return '\0';
  }
  return identifier.at(entityName)->getType();
}
Entity* JsonParser::loadEntity(const string& entityName) {
  if (identifier.find(entityName) == identifier.end()) {
    return NULL;
  }
  return identifier.at(entityName);
}
JsonParser::~JsonParser() {
  deleteResources();
}

Entity* JsonParser::clone() const{
  auto el = new JsonParser();
  *el = *this;
  return el;
}

void JsonParser::clear() {
  names.clear();
  identifier.clear();
}
//JsonParser friend methods
ostream& operator<<(ostream& out, JsonParser& json) {
  out << json.stringify();
  return out;
}
void Save(ostream& os, const JsonParser& json) {
  auto jsonStr = json.stringify();
  Save(os, jsonStr);
}
void SaveAsText(ostream& os, const JsonParser& json, char delim = '\n') {
  auto jsonStr = json.stringify();
  SaveAsText(os, jsonStr, delim);
}
void Load(istream& is, JsonParser& json) {
  string jsonStr;
  Load(is, jsonStr);
  json = JsonParser(jsonStr);
}
void LoadAsText(istream& is, JsonParser& json) {
  string jsonStr;
  LoadAsText(is, jsonStr);
  json = JsonParser(jsonStr);
}


