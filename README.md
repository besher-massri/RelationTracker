# RelationTracker


Relation Tracker is a tool that tracks main entities [people and organizations] within each topic through time.
The main types of relations between the entities are detected and observed in time. The tool provides multiple ways of visualizing this information with different scales and durations.
It uses events data from Event Registry as a source of information, with the aim of getting holistic insights about the searched topic.

## Description of Data

The tool is based on [Event Registry](http://eventregistry.org), which is a system for real-time collection, annotation, and analysis of content published by global news outlets.
It uses its events data as its main data source and uses its articles data to extract news agencies from articles.


Each event consists of general information like title, event date, total article count, etc.,
and a list of concepts that characterize the event, which is split into entity concepts and non-entity concepts.
Entity concepts are people, organizations, and locations related to the event.
Whereas non-entity concepts represent abstract terms that define the topic of the event, like technology, education, and investment.
Those concepts were extracted using [JSI Wikifier](http://wikifier.org/), which is a service that enables semantic annotation of the textual data in different languages. 
In addition, each concept has a score that represents the relevancy of that concept to the event.

For a more information about the input data format, please refer to sampleData/sampleInput/ directory.

  

## Dependencies

* g++ v6.3.0 
* node.js v6.9.2
* d3.js v4 (source is included in the project) 
* bootstrap v3.3.7
* jquery v3.3.1
* npm v5.6.0
* npm packages:
  - check package.json files in both ClustersProcessor/ & VisualizationInterface/ directories




## Installation & Development Setup

1. Clone the project into local space and get into the directory:
```
git clone https://github.com/besher-massri/RelationTracker.git
cd RelationTracker/
```

2. Compile the blacklist aggregator file:
```
cd blackListAggregator/
g++ -std=c++11 blacklistaggregator.cpp -o blacklistaggregator
cd ..
```
3. Compile the events analyzer file:
```
cd EventsAnalyzer/
g++ -std=c++11 eventsanalyzer.cpp -o eventsanalyzer
cd ..
```

4. Install the node dependencies for the clusters processor part
```
cd clustersProcessor/
npm install 
cd ..
```

5. Install the node dependencies for the visualization interface part
```
cd visualizationInterface/
npm install 
cd ..
```


## Usage

For using the tool effectively, you will need enough data to obtain good results (the website was seeded with ~5.7m events). 
You can retrieve events using the [Event Registry API](http://eventregistry.org/documentation?tab=searchEvents). 
For experimental purposes, you can use the provided samples in the sampleData/input/ directory.
The config file is initialized in compliance with the sample data provided.

In both ways, you will need to provide your API key for Event Registry, which you can obtain by creating a free account [here](http://eventregistry.org/register).


Considering that you have finished the installation & development setup, do the following steps in order:

1. Prepare the inputs files for the tool, the format must be one event/article json per line. Check the sample data for an example.

2. Change the config file up to your needs (file is in the root folder), the description of each of the parameters can be found in [wiki][wiki-config].
 
3. Run the executive file for blackList aggregator:
  ```
  cd BlackListAggregator/
  ./blacklistaggregator (or ./blacklistaggregator.exe if using windows)
  cd ..
  ```

  * You will be provided with a summary indicating total & unique number of items aggregated and the autoBlackList file will be created in the output folder.

4. Run the events analyzer part to cluster the events into topics:
  ```
  cd EventsAnalyzer/
  ./eventsanalyzer (or ./eventsanalyzer.exe if using windows)
  cd ..
  ```

  * This might take a long time based on the size of your input data.
  Once the program finished, several files will be created for each cluster in addition to a meta file containing a summary of the process.

5. Run the clusters processor part to perform additional processing on the clusters:
  ```
  cd ClustersProcessor/
  node clustersprocessor.js
  cd ..
  ```

  * This will modify the clusters' files and produce a list of candidates topic names for each cluster.

6. Copy the files from your output folder, along with the config file into visualizationInterface/public/data (you have to create the folder)

7. Finally, run the server.js file in visualizationInterface/bin/ :

  ```
  cd visualizationInterface/bin/
  node server.js
  ```

  * If no port is provided it will run under port number 5050.

  Note: you might need to run clusters processor and visualization interface parts with extra memory,
  to do so, adjust the size of allowed memory by using --max_old_space_size flag as follows:
  ```
  node --max_old_space_size=XXXX filename
  ```

  For more information, please refer to the [wiki][wiki-main-components].

## Acknowledgments
This work is developed by [AILab](http://ailab.ijs.si/) at [Jozef Stefan Institute](https://www.ijs.si/).

The work is supported by the [euBusinessGraph project (ICT-732003IA)](http://eubusinessgraph.eu/),
a project that aims to create a crossborder knowledge graph of companies, and a set of innovative business products and services build upon the knowledge graph.

<!-- Markdown link & img dfn's -->
[wiki-main-components]: https://github.com/besher-massri/RelationTracker/wiki#main-components
[wiki-config]: https://github.com/besher-massri/RelationTracker/wiki#configuration-file

