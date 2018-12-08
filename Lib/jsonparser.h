#pragma once
#ifndef JSONPARSER_H
#define JSONPARSER_H
#define _CRT_SECURE_NO_WARNINGS
#include <map>
#include <utility>
#include <vector>
#include <regex>
#include <iomanip>
#include "../Lib/stringprocessing.h"
#include "../Lib/serialization.h"
using std::vector;
using std::string;
using std::pair;
using std::ostream;
using std::istream;
using std::map;

#define NUMBER long double
class Entity;
class String;
class Number;
class JsonParser;
class Boolean;
class Array;

class Entity {
  /*
  * types are:
  *     's': string
  *     'o': object
  *     'd': number
  *     'a': array
  *     'b': boolean
  *     'n': null
  *     null is store in place (there is no derived class for it)
  */
private:
  char type;
public:
  explicit Entity(char typeOfEntity) : type(typeOfEntity) {}
  virtual ~Entity() {}
  virtual Entity* clone() const;

  const char& getType() const { return type; }
  virtual void stringify(string& res) const;
  virtual void stringifyFormatted(string& res, string tabs) const;
  virtual string stringify() const;
  virtual string stringifyFormatted() const;
};

class Boolean :public Entity {
private:
  bool element;
  void stringify(string& res) const override;
  void stringifyFormatted(string& res, string tab) const override;

public:
  Boolean(const bool& el) : Entity('b'), element(el) {};
  Boolean() : Entity('b'), element(false) {}

  ~Boolean() {}
  Entity* clone() const override;

  const bool& getBoolean() const;
  bool& loadBoolean();
  string stringify() const override;
  string stringifyFormatted() const override;

  friend class JsonParser;
};

class String :public Entity {
private:
  string element;
private:
  void stringify(string& res) const override;
  void stringifyFormatted(string& res, string tab) const override;

public:
  String() :Entity('s') {}
  String(const string& el, bool decode = false);;
  Entity* clone() const override;

  const string& getString()const { return element; }
  string& loadString() { return element; }
  string stringify() const override;
  string stringifyFormatted() const override;

  friend class JsonParser;
};

class Number :public Entity {
private:
  NUMBER element;
  char precision;
private:
  void stringify(string& res) const override;
  void stringifyFormatted(string& res, string tabs) const override;

public:
  Number(const NUMBER& el, int prec = 6) :Entity('d'), element(el), precision(prec) {};
  Number() :Entity('d'), element(0), precision(0) {}
  Entity* clone() const override;

  const NUMBER& getNumber() const;
  long long getNumberAsLong() const;
  int getNumberAsInt() const;
  NUMBER& loadNumber();
  string stringify() const override;
  string stringifyFormatted() const override;

  friend class JsonParser;
};

class Array : public Entity {
  typedef typename vector<Entity *>::iterator iterator;
  typedef typename vector<Entity *>::const_iterator const_iterator;
private:
  vector<Entity *> elements;
private:
  void stringify(string& res) const override;
  void stringifyFormatted(string& res, string tabs) const override;
  Entity* clone() const override;
  void deleteResources();
  inline void deepCopyItem(const Entity *it);
  inline void deepCopy(const Array& obj);

public:
  Array() : Entity('a') {}
  Array(const vector<Entity *>& el) : Entity('a'), elements(el) {}
  template <typename T>Array(const vector<T>& el);
  Array(const vector<int>& el);
  Array(const vector<string>& el);
  Array(const Array& obj);
  ~Array();

  const vector<Entity *>& getArray() const;
  vector<Entity *>& loadArray();
  void addEntity(Entity *el);
  void addEntity(const char *el);
  void addEntity(const string& el);
  void addEntity(const bool& el);
  void addEntity(const int& el);
  void addEntity(const NUMBER& el);
  void addEntity(long double el);
  void addEntity(const JsonParser& el);
  void addEntity(const Array& el);

  int length() const;
  int size();
  Array& operator=(const Array& obj);
  void concat(const Array *v);
  Entity*& operator [](int idx);
  Entity* const& operator [](int idx) const;
  iterator begin() noexcept;
  const_iterator cbegin() const noexcept;
  iterator end() noexcept;
  const_iterator cend() const noexcept;

  string stringify() const override;
  string stringifyFormatted() const override;

  friend class JsonParser;
  friend ostream& operator<<(ostream& out, Array& arr);
};

class JsonParser :public Entity {
  typedef pair<int, Entity *> resType;
  typedef typename vector<string>::iterator iterator;
  typedef typename vector<string>::const_iterator const_iterator;
private:
  map<string, Entity *> identifier;
  vector<string>names;
  static Entity *dummy;
  static resType failResult;
  static JsonParser invalidJson;
  static Array invalidJsonArray;
  static string invalidJsonString;
  static NUMBER invalidJsonNumber;
  static bool invalidJsonBool;
private:
  static __inline bool isSpecialCharacter(char c);
  int getNextSpecialCharacter(const string& json, int idx, int endIdx);
  int getClosingQuotation(const string& json, int idx, char quotation,
    int endIdx);
  string deleteSpaces(const string& rhs);
  int processJson(const string& json, int idx, int endIdx);
  resType processArray(const string& json, int idx, int endIdx);
  resType processObj(const string& json, int idx, int endIdx);
  resType processValue(const string& json, int idx, int endIdx);

  void stringify(string& res) const override;
  void stringifyFormatted(string& res, string tabs) const override;
  void deleteResources();
  inline void deepCopyItem(const string& name, const Entity *it);
  inline void deepCopy(const JsonParser& obj);
  Entity* loadEntity(const string& entityName);

public:
  JsonParser() :Entity('o') {}
  JsonParser(string _json);
  JsonParser(const JsonParser& obj);
  ~JsonParser();
  Entity* clone() const override;

  void clear();
  JsonParser& operator=(const JsonParser& obj);
  bool addEntity(const string& name, const Entity *obj);
  bool addEntity(const string& name, const JsonParser& obj);
  bool addEntity(const string& name, const Array& obj);
  bool addEntity(const string& name, const string& value);
  bool addEntity(const string& name, const char *value);
  bool addEntity(const string& name, const bool& value);
  bool addEntity(const string& name, NUMBER value);

  //non-original types
  bool addEntity(const string& name, const int& value);
  bool addEntity(const string& name, const double& value);
  bool addEntity(const string& name, const float& value);
  template<typename T>bool addEntity(const string& name, const vector<T>& value);
  const map<string, Entity *>& getData();
  //loading means getting modifiable references to the object
  string& loadString(const string& entityName);
  bool& loadBoolean(const string& entityName);
  NUMBER& loadNumber(const string& entityName);
  Array& loadArray(const string& entityName);
  JsonParser& loadJson(const string& entityName);

  //getting means getting non-modifiable references to the object
  const string& getString(const string& entityName) const;
  const bool& getBoolean(const string& entityName)const;
  const NUMBER& getNumber(const string& entityName)const;
  long long getNumberAsLong(const string & entityName) const;
  int getNumberAsInt(const string & entityName) const;
  const JsonParser& getJson(const string& entityName)const;
  const Array& getArray(const string& entityName)const;

  static string& loadString(Entity *entity);
  static bool& loadBoolean(Entity *entity);
  static NUMBER& loadNumber(Entity *entity);
  static JsonParser& loadJson(Entity *entity);
  static Array& loadArray(Entity *entity);

  static const  string& getString(const Entity *entity);
  static const  bool& getBoolean(const Entity *entity);
  static const  NUMBER& getNumber(const Entity *entity);
  static long long getNumberAsLong(const Entity *entity);
  static const  JsonParser& getJson(const Entity *entity);
  static const  Array& getArray(const Entity  *entity);

  static bool isValidType(const string& el);
  static bool isValidType(const NUMBER& el);
  static bool isValidType(const bool& el);
  static bool isValidType(const JsonParser& el);
  static bool isValidType(const Array& el);

  char getType(const string& entityName) const;
  const vector<string>& getNames();

  iterator begin() noexcept;
  const_iterator cbegin() const noexcept;
  iterator end() noexcept;
  const_iterator cend() const noexcept;

  string stringify() const override;
  string stringifyFormatted() const override;

  friend void Save(ostream& os, const JsonParser& json);
  friend void SaveAsText(ostream& os, const JsonParser& json, char delim);
  friend void Load(istream& os, JsonParser& json);
  friend void LoadAsText(istream& os, JsonParser& json);

  friend ostream& operator<<(ostream &out, JsonParser& json);
  friend class Array;
};

#endif //JSONPARSER_H


