#ifndef STRING_PROCESSING_H
#define STRING_PROCESSING_H
#include <string>
#include <regex>
#include <sstream>
#include <fstream>
#include <iostream>
#include <vector>
#include <sys/types.h>
#include <sys/stat.h>
using std::max;
using std::cout;
using std::left;
using std::endl;
using std::ifstream;
using std::istringstream;
using std::wstring;
using std::to_string;
using std::string;
using std::regex;
using std::vector;
inline string mergeLineSplitter(const string& str) {
  string res = "";
  int n = static_cast<int>(str.length());
  for (int i = 0; i < n; ++i) {
    if (!i || str[i] != '\n' || str[i - 1] != '\n') {
      res += str[i];
    }
  }
  return res;
}
inline string decodeEscapeCharacters(const string& str) {
  string res = "";
  int n = static_cast<int>(str.length());
  for (int i = 0; i < n; ++i) {
    if (str[i] == '\\') {
      ++i;
      if (str[i] == 't') {
        res += '\t';
      } else if (str[i] == 'n') {
        res += '\n';
      } else if (str[i] == 'b') {
        res += '\b';
      } else if (str[i] == 'f') {
        res += '\f';
      } else if (str[i] == '\"') {
        res += '\"';
      } else if (str[i] == '\\') {
        res += '\\';
      } else {
        res += "\\";
        res += str[i];
      }
    } else {
      res += str[i];
    }
  }
  return res;
}

inline string encodeEscapeCharacters(const string& str) {
  string res = "";
  int n = static_cast<int>(str.length());
  for (int i = 0; i < n; ++i) {
    if (str[i] == '\t') {
      res += "\\t";
    } else if (str[i] == '\n') {
      res += "\\n";
    } else if (str[i] == '\b') {
      res += "\\b";
    } else if (str[i] == '\f') {
      res += "\\f";
    } else if (str[i] == '\"') {
      res += "\\\"";
    } else if (str[i] == '\\' && (i+1>=n || str[i+1]!='u')) {
      //to handle the case of \uxxxx
      res += "\\\\";
    } else {
      res += str[i];
    }
  }
  return res;
}
inline bool isWhiteSpace(char c) {
  return c == ' ' || c == '\n' || c == '\t';
}
inline bool isCompositeWhiteSpace(char first, char second) {
  return first == '\\' && (second == 'n' || second == 't');
}
inline string toLower(const string& word) {
  string str = "";
  int n = static_cast<int>(word.length());
  for (int i = 0; i < n; ++i) {
    str += tolower(word[i]);
  }
  return str;
}
inline string toUpper(const string& word) {
  string str = "";
  int n = static_cast<int>(word.length());
  for (int i = 0; i < n; ++i) {
    str += toupper(word[i]);
  }
  return str;
}
inline string charToHex(int number) {
  if (number < 0 || number>255) { return ""; }
  string res = "";
  int temp = number / 16;
  res += temp < 10 ? temp + '0' : 'A' + temp - 10;
  temp = number % 16;
  res += temp < 10 ? temp + '0' : 'A' + temp - 10;
  return res;
}
inline vector<string> splitter(const string& str, const string& delim,
  bool allowEmptyStrings = false) {
  vector<string> res;
  string temp = "";
  for (auto it : str) {
    if (delim.find(it) == delim.npos) {
      temp += it;
    } else if (allowEmptyStrings || temp.size() > 0) {
      res.push_back(temp);
      temp = "";
    }
  }
  if (temp.size() > 0) {
    res.push_back(temp);
  }
  return res;
}
/*
* filter the word from the non-ascii characters and
    non-alphabetical non-numerical characters
    except some symbols for numbers (+-.)
*   with possibly allowing spaces
* parameters:
*	  word: the word to be processed
*   containSpace: flag indicating whether to allow including spaces
* return value
*	  the new filtered word
*/
inline string handleNonAscii(const string& word, bool containSpace = true) {
  string res;
  int n = static_cast<int>(word.length());
  for (int i = 0; i < n; ++i) {
    if (word[i] >= 0 && word[i] <= 255) {
      res += word[i];
    } else {
      res += "%" + charToHex(word[i] + 256);
    }
  }
  return res;
}

inline string clearWord(const string& word, bool containSpace = true) {
  string res = "";
  const string moneySigns = "¢$£€¥";
  string allowedCharaters = ".+-%" + moneySigns;
  int n = static_cast<int>(word.length());
  for (int i = 0; i < n; ++i) {
    if ((word[i] >= 0 && word[i] <= 255 && isalnum(word[i])) ||
      allowedCharaters.find(word[i]) != allowedCharaters.npos ||
      (containSpace && word[i] == ' ')) {

      res += word[i];
    }
  }
  res = toLower(res);
  return res;
}
/*
* detect whether the word sent is an integer or not, with possibly return it
    by a pointer parameter
* parameters:
*	  token: the word to be processed
*   *number: a pointer that holds the address of the variable to be stored in
* return value
*	  true/false indicating whether it's an integer or not
*/
inline bool isInteger(string token, int *number = NULL) {
  token = clearWord(token, false);
  if (token.length() == 0) { return false; }
  if (token.length() == 1 && (token[0] == '+' || token[0] == '-')) {
    return false;
  }
  regex numberFormat(R"([-+]?\d+[bm]?)");
  if (regex_match(token, numberFormat)) {
    istringstream in(token);
    int v;
    in >> v;
    if (number) {
      *number = v;
    }
    return true;
  }
  return false;
}
/*
* detect whether the word sent is a number or not, with possibly return it
    by a pointer parameter
* parameters:
*	  token: the word to be processed
*   *number: a pointer that holds the address of the variable to be stored in
* return value
*	  true/false indicating whether it's a number or not
*/
inline bool isNumber(string token, double *number = NULL) {
  token = clearWord(token, false);
  if (token.length() == 0) { return false; }

  if (token.length() == 1 && (token[0] == '+' || token[0] == '-')) {
    return false;
  }
  regex numberFormat(R"([+-]?[\d,]+\.?[\d,]*([eE][+-]?\d+)?\.?(bn|m)?)");
  int len = static_cast<int>(token.length());
  if (regex_match(token, numberFormat)) {
    int posE = len, posDot = len;
    for (int i = 0; i < len && (posE == len || posDot == len); ++i) {
      if (token[i] == 'e' || token[i] == 'E') {
        posE = i;
      } else if (token[i] == '.') {
        posDot = i;
      }
    }
    istringstream in(token);
    int precision = max(0, posE - posDot - 1);
    long double v;
    in >> v;
    if (number) {
      *number = v;
    }
    return true;
  }
  return false;
}

/*
* Reading a file and return its content as string
* parameter:
*		filePath: the path of the file to be read
* return value
*		a string of the content of the file
*/
inline string loadFile(string filePath) {
  std::ifstream t(filePath);
  if (!t.is_open()) {
    return "";
  }
  std::stringstream buffer;
  buffer << t.rdbuf();
  t.close();
  return buffer.str();
}
/*
* writing a string into a file
* parameter:
*		filePath: the path of the file to be written into
*   buffer:   the string content to be written
* return value
*		true/false whether the saving has succeeded or not
*/
inline bool saveFile(const string& filePath, const string& buffer) {
  std::ofstream t(filePath);
  t << buffer << endl;
  t.close();
  return t.bad();
}
/*
* padding the number with zero to have at least a specific number of digits
* parameters:
*     number: the number to be processed
*     nDigits: the number of digits that resulted number should have at least,
               by padding it with zeros if necessary
* return value:
*      the padded number as a string
*/
inline string paddingnumber(int number, int nDigits = 3) {
  string res = "";
  if (number < 0) {
    res += "-", number = abs(number);
  }
  for (int i = 1, po = 10; i < nDigits; ++i, po *= 10) {
    if (number < po) {
      res += "0";
    }
  }
  res += to_string(number);
  return res;
}
/*
* checking if there exists a file with the given path
* parameters:
*     filePath: the path to the file to be checked
* return value:
*      true/false indicating whether that file exists or not
*/
inline bool fileExist(const std::string& filePath) {
  struct stat buffer;
  return (stat(filePath.c_str(), &buffer) == 0);
}
/*
  checks that the directory specified exists, and creates it otherwise
  parameters:
      dir: the directory to be checked
  return value:
    none
*/
inline void ensureDirectory(const std::string& dir) {
  struct stat info;
  if (stat(dir.c_str(), &info) != 0 || !(info.st_mode & S_IFDIR)) {
    //printf("%s is no directory\n", dir);
    string com = "mkdir ";
    com += "\"" + dir + "\"";
    system(com.c_str());
  }
}
#endif // !STRING_PROCESSING_H
