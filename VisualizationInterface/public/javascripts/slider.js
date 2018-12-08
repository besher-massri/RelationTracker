'use strict';
function Slider() {
  let callBackFunction;
  let datesList;
  let fromDateIdx, toDateIdx;
  let intervalActivated;

  let div, svg, width, height, padding;
  let minDate, maxDate;
  let timeFormatFull, numericalFullTimeFormat;
  let timeTicks, timeTicksInterval;
  let x, rangeOfLine, beginningOfLine;
  let axis = { d: undefined, o: undefined };
  let firstHandleSelectedDateIdx, secondHandleSelectedDateIdx;
  let changeModeOrScale;
  let intervalLine, slider;
  let handle, secondHandle;
  let dateTitle;//div object that show title
  d3.selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  function getWeek(d) {
    let dayNumber = parseInt(d3.timeFormat("%d")(d));
    return Math.floor(dayNumber / 7) + (dayNumber % 7 > 0?1:0);
  }
  function configureTimeScale() {
    let scaleDegree = d3.select('input[name="scale"]:checked').property("value");
    if (scaleDegree === "Monthly") {
      timeFormatFull = d3.timeFormat("%b %y");
      numericalFullTimeFormat = d3.timeFormat("%Y %m");
    } else if (scaleDegree === "Weekly") {
      timeFormatFull = function (d) {
        return "W" + getWeek(d) + " " + d3.timeFormat("%b %y")(d);
      };
      numericalFullTimeFormat = function (d) {
        return d3.timeFormat("%Y %m")(d) + " W" + getWeek(d);
      };
    } else if (scaleDegree === "Daily") {
      timeFormatFull = d3.timeFormat("%d %b %y");
      numericalFullTimeFormat = d3.timeFormat("%Y %m %d");
    }
    let tempArr = datesList.slice(fromDateIdx, toDateIdx).map(function (cur) {
      return cur.date;
    });
    timeTicks = [];
    timeTicksInterval = [];
    for (let i = 0; i < tempArr.length; ++i) {
      if (!i || timeFormatFull(tempArr[i]) !== timeFormatFull(tempArr[i - 1])) {
        timeTicks.push(tempArr[i]);
        timeTicksInterval.push([fromDateIdx + i, fromDateIdx + i + 1]);
      } else
        timeTicksInterval[timeTicksInterval.length - 1][1]++;
    }
    minDate = timeTicks[0], maxDate = timeTicks[timeTicks.length - 1];
    x = d3.scaleTime()
      .domain([
        minDate,
        maxDate
      ])
      .range([beginningOfLine, beginningOfLine + rangeOfLine])
      .clamp(true);

    axis.d = d3.axisBottom(x)
      .tickFormat(timeFormatFull);

    axis.o
      .call(axis.d);
    axis.o.select("path")
      .attr("stroke-opacity", "0");

  }
  function addSliderObject() {
    /// setting up the slider DOM objects
    slider = svg.append("g")
      .attr("class", "slider")
      .attr("transform", "translate(" + 0 + "," + 20 + ")");
    axis.o = slider.append("g")
      .classed("axis", "true")
      .attr("transform", "translate(" + [0, 10] + ")");

    dateTitle = slider.append("div")
      .attr("id", "tooltip-handle")
      .style("opacity", 0);

    slider.append("line")
      .attr("class", "track")
      .attr("x1", beginningOfLine)
      .attr("x2", beginningOfLine + rangeOfLine)
      .select(function () {
        let temp = this.parentNode.appendChild(this.cloneNode(true));
        return temp;
      })
      .attr("class", "track-inset")
      .select(function () {
        return this.parentNode.appendChild(this.cloneNode(true));
      })
      .attr("class", "track-overlay");

    intervalLine = slider.append("line")
      .attr("class", "track")
      .attr("x1", beginningOfLine)
      .attr("x2", beginningOfLine + rangeOfLine)
      .attr("class", "track-inset-interval")
      .attr("stroke-opacity", 0);

    handle = slider.insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("r", 9);

    handle.moveToFront();

    handle.on("mouseover", function () {
      dateTitle.transition()
        .duration(200)
        .style("opacity", .9);

      dateTitle.html(
        timeFormatFull(timeTicks[findNearestTimeTick(x.invert(d3.event.x))]))
        .attr("x", function () {
          return handle.attr("cx") + "px";
        })
        .attr("y", handle.attr("cy") + "px")
        .moveToFront();
    }).on("mouseout", function () {
      dateTitle.transition()
        .duration(500)
        .style("opacity", 0);
    });
    handle
      .call(d3.drag()
        .on("drag", function () {
          hue(x.invert(d3.event.x), undefined, "sleep");
        })
        .on("end", function () {
          hue(x.invert(d3.event.x), undefined, "action");
        })
      );

    secondHandle = slider
      .insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr("r", 9)
      .attr("opacity", 0)
      .moveToFront();

    secondHandle
      .call(d3.drag()
        .on("drag", function () {
          hue(undefined, x.invert(d3.event.x), "sleep");
        })
        .on("end", function () {
          hue(undefined, x.invert(d3.event.x), "action");
        })
      );

    secondHandle.on("mouseover", function () {
      dateTitle.transition()
        .duration(200)
        .style("opacity", .9);
      dateTitle.html(
        timeFormatFull(timeTicks[findNearestTimeTick(x.invert(d3.event.x))])
      )
        .style("left", secondHandle.attr("x"))
        .style("top", secondHandle.attr("y"))
        .moveToFront();
    }).on("mouseout", function () {
      dateTitle.transition()
        .duration(500)
        .style("opacity", 0);
    });

    slider.insert("g", ".track-overlay")
      .attr("class", "ticks")
      .attr("transform", "translate(0," + 18 + ")");
  }

  function findNearestTimeTick(h) {
    let idx = 0, dis = h - timeTicks[0];
    for (let i = 0; i < timeTicks.length; ++i)
      if (dis > Math.abs(h - timeTicks[i]))
        idx = i, dis = Math.abs(h - timeTicks[i]);
    return idx;
  }
  function hue(h1, h2, status = "normal") {
    let idx1, idx2;
    if (h1) {
      idx1 = findNearestTimeTick(h1);
    } else {
      idx1 = firstHandleSelectedDateIdx;
    }
    if (h2) {
      idx2 = findNearestTimeTick(h2);
    } else {
      idx2 = secondHandleSelectedDateIdx;
    }
    let begDate = undefined, endDate = undefined;
    if (h1) {
      handle.attr("cx", x(timeTicks[idx1]));
    }
    if (h2) {
      secondHandle.attr("cx", x(timeTicks[idx2]));
    }
    if (intervalActivated) {
      begDate = timeTicks[idx1];
      endDate = timeTicks[idx2];
      if (begDate > endDate) {
        let temp = begDate;
        begDate = endDate;
        endDate = temp;
      }
      intervalLine
        .attr("x1", x(begDate))
        .attr("x2", x(endDate));

      d3.select("#interval-date-info").html(
        timeFormatFull(begDate)
        + " -> " + timeFormatFull(endDate)
      );
    } else {
      d3.select("#interval-date-info").text(timeFormatFull(timeTicks[idx1]));
    }
    if (!changeModeOrScale && (status !== "action" ||
      firstHandleSelectedDateIdx === idx1 && secondHandleSelectedDateIdx === idx2))
      return;

    changeModeOrScale = false;
    if (h1) {
      firstHandleSelectedDateIdx = idx1;
    } if (h2) {
      secondHandleSelectedDateIdx = idx2;
    }
    if (intervalActivated) {
      if (status !== "sleep")
        callBackFunction(begDate, endDate, numericalFullTimeFormat);
    } else {
      if (status !== "sleep")
        callBackFunction(timeTicks[idx1], timeTicks[idx1], numericalFullTimeFormat);
    }
  }

  this.onAction = function (callback) {
    callBackFunction = callback;
  };

  this.init = function () {
    datesList = [];
    fromDateIdx = 0;
    toDateIdx = 0;
    intervalActivated = false;
    changeModeOrScale = false;

    div = d3.select("#slider-slider-part-div");
    div.selectAll("svg").remove();
    svg = div.append("svg")
      .attr("width", div.style("width"))
      .attr("height", div.style("height"));

    width = svg.attr("width");
    width = width.substring(0, width.length - 2);
    height = svg.attr("height");
    height = height.substring(0, height.length - 2);
    padding = 20;
    beginningOfLine = padding;
    rangeOfLine = width - padding - beginningOfLine;
    addSliderObject();
    handle.attr("opacity", 0);
  };

  this.updateSlider = function (listOfDates, fromIdx, toIdx) {
    if (listOfDates !== undefined && listOfDates !== datesList) {
      datesList = listOfDates;
      fromDateIdx = 0;
      toDateIdx = datesList.length;
      // if updates the list of dates, return it to the single point mode
      this.cancelInterval(true);
    }
    if (fromIdx !== undefined) {
      fromDateIdx = fromIdx;
    }
    if (toIdx !== undefined) {
      toDateIdx = toIdx;
    }
    handle.attr("opacity", 1);
    configureTimeScale();
    changeModeOrScale = true;
    if (intervalActivated) {
      hue(timeTicks[0],
        timeTicks[timeTicks.length - 1]);
    } else {
      hue(timeTicks[0]);
    }
  };

  this.beginInterval = function () {
    changeModeOrScale = true;
    secondHandle.attr("opacity", 100);
    intervalActivated = true;
    intervalLine.attr("stroke-opacity", 100);
    if (firstHandleSelectedDateIdx === timeTicks.length - 1)
      hue(undefined,
        timeTicks[firstHandleSelectedDateIdx - 1]);
    else
      hue(undefined,
        timeTicks[firstHandleSelectedDateIdx + 1]);
  };

  this.cancelInterval = function (silentMode = false) {
    changeModeOrScale = true;
    secondHandle.attr("opacity", 0);
    intervalLine.attr("stroke-opacity", 0);
    intervalActivated = false;
    if (!silentMode) {
      let singleDate = x.invert(Math.min(handle.attr("cx"), secondHandle.attr("cx")));
      hue(singleDate, singleDate);
      handle.moveToFront();
    }
  };

  this.magnify = function () {
    document.getElementById("cancel-magnify-button").disabled = false;
    d3.select("#cancel-magnify-button").style("opacity", 1);
    if (intervalActivated) {
      let mnSel = Math.min(firstHandleSelectedDateIdx, secondHandleSelectedDateIdx);
      let mxSel = Math.max(firstHandleSelectedDateIdx, secondHandleSelectedDateIdx);
      // take the corresponding intervals from the original datesList
      fromDateIdx = timeTicksInterval[mnSel][0];
      toDateIdx = timeTicksInterval[mxSel][1];
      this.updateSlider();
    } else {
      document.getElementById("daily-scale-radiobutton").checked = true;
      let curSel = firstHandleSelectedDateIdx;
      fromDateIdx = timeTicksInterval[curSel][0];
      toDateIdx = timeTicksInterval[curSel][1];
      this.updateSlider();
    }
  };
  this.cancelMagnification = function () {
    document.getElementById("cancel-magnify-button").disabled = true;
    d3.select("#cancel-magnify-button").style("opacity", 0);
    fromDateIdx = 0;
    toDateIdx = datesList.length;
    this.updateSlider();
  };
  this.moveSlider = function (numOfDatesToMove) {
    if (numOfDatesToMove + firstHandleSelectedDateIdx >= timeTicks.length
      || numOfDatesToMove + firstHandleSelectedDateIdx < 0)
      return;
    if (intervalActivated) {
      if (numOfDatesToMove + secondHandleSelectedDateIdx >= timeTicks.length
        || numOfDatesToMove + secondHandleSelectedDateIdx < 0)
        return;
      hue(
        timeTicks[firstHandleSelectedDateIdx + numOfDatesToMove],
        timeTicks[secondHandleSelectedDateIdx + numOfDatesToMove],
        "action"
      );
    } else {
      hue(
        timeTicks[firstHandleSelectedDateIdx + numOfDatesToMove],
        undefined, "action");
    }
  };
}