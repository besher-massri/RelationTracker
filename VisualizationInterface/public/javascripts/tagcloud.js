function TagCloud() {
  (function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f()
    } else if (typeof define === "function" && define.amd) {
      define([], f)
    } else {
      let g;
      if (typeof window !== "undefined") {
        g = window
      } else if (typeof global !== "undefined") {
        g = global
      } else if (typeof self !== "undefined") {
        g = self
      } else {
        g = this
      }
      g = (g.d3 || (g.d3 = {}));
      g = (g.layout || (g.layout = {}));
      g.cloud = f()
    }
  })(function() {
    let define, module, exports;
    return (function e(t, n, r) {
      function s(o, u) {
        if (!n[o]) {
          if (!t[o]) {
            let a = typeof require == "function" && require;
            if (!u && a) return a(o, !0);
            if (i) return i(o, !0);
            let f = new Error("Cannot find module '" + o + "'");
            throw f.code = "MODULE_NOT_FOUND", f
          }
          let l = n[o] = { exports: {} };
          t[o][0].call(l.exports,
            function(e) {
              let n = t[o][1][e];
              return s(n ? n : e)
            },
            l,
            l.exports,
            e,
            t,
            n,
            r)
        }
        return n[o].exports
      }

      let i = typeof require == "function" && require;
      for (let o = 0; o < r.length; o++) s(r[o]);
      return s
    })({
        1: [
          function(require, module, exports) {
            // Word cloud layout by Jason Davies, https://www.jasondavies.com/wordcloud/
            // Algorithm due to Jonathan Feinberg, http://static.mrfeinberg.com/bv_ch03.pdf

            let dispatch = require("d3-dispatch").dispatch;

            let cloudRadians = Math.PI / 180,
              cw = 1 << 11 >> 5,
              ch = 1 << 11;

            module.exports = function() {
              let size = [256, 256],
                text = cloudText,
                font = cloudFont,
                fontSize = cloudFontSize,
                fontStyle = cloudFontNormal,
                fontWeight = cloudFontNormal,
                rotate = cloudRotate,
                padding = cloudPadding,
                spiral = archimedeanSpiral,
                words = [],
                timeInterval = Infinity,
                event = dispatch("word", "end"),
                timer = null,
                random = Math.random,
                cloud = {},
                canvas = cloudCanvas;

              cloud.canvas = function(_) {
                return arguments.length ? (canvas = functor(_), cloud) : canvas;
              };

              cloud.start = function() {
                let contextAndRatio = getContext(canvas()),
                  board = zeroArray((size[0] >> 5) * size[1]),
                  bounds = null,
                  n = words.length,
                  i = -1,
                  tags = [],
                  data = words.map(function(d, i) {
                    d.text = text.call(this, d, i);
                    d.font = font.call(this, d, i);
                    d.style = fontStyle.call(this, d, i);
                    d.weight = fontWeight.call(this, d, i);
                    d.rotate = rotate.call(this, d, i);
                    d.size = ~~fontSize.call(this, d, i);
                    d.padding = padding.call(this, d, i);
                    return d;
                  }).sort(function(a, b) { return b.size - a.size; });

                if (timer) clearInterval(timer);
                timer = setInterval(step, 0);
                step();

                return cloud;

                function step() {
                  let start = Date.now();
                  while (Date.now() - start < timeInterval && ++i < n && timer) {
                    let d = data[i];
                    d.x = (size[0] * (random() + .5)) >> 1;
                    d.y = (size[1] * (random() + .5)) >> 1;
                    cloudSprite(contextAndRatio, d, data, i);
                    if (d.hasText && place(board, d, bounds)) {
                      tags.push(d);
                      event.call("word", cloud, d);
                      if (bounds) cloudBounds(bounds, d);
                      else bounds = [{ x: d.x + d.x0, y: d.y + d.y0 }, { x: d.x + d.x1, y: d.y + d.y1 }];
                      // Temporary hack
                      d.x -= size[0] >> 1;
                      d.y -= size[1] >> 1;
                    }
                  }
                  if (i >= n) {
                    cloud.stop();
                    event.call("end", cloud, tags, bounds);
                  }
                }
              }

              cloud.stop = function() {
                if (timer) {
                  clearInterval(timer);
                  timer = null;
                }
                return cloud;
              };

              function getContext(canvas) {
                canvas.width = canvas.height = 1;
                let ratio = Math.sqrt(canvas.getContext("2d").getImageData(0, 0, 1, 1).data.length >> 2);
                canvas.width = (cw << 5) / ratio;
                canvas.height = ch / ratio;

                let context = canvas.getContext("2d");
                context.fillStyle = context.strokeStyle = "red";
                context.textAlign = "center";

                return { context: context, ratio: ratio };
              }

              function place(board, tag, bounds) {
                let perimeter = [{ x: 0, y: 0 }, { x: size[0], y: size[1] }],
                  startX = tag.x,
                  startY = tag.y,
                  maxDelta = Math.sqrt(size[0] * size[0] + size[1] * size[1]),
                  s = spiral(size),
                  dt = random() < .5 ? 1 : -1,
                  t = -dt,
                  dxdy,
                  dx,
                  dy;

                while (dxdy = s(t += dt)) {
                  dx = ~~dxdy[0];
                  dy = ~~dxdy[1];

                  if (Math.min(Math.abs(dx), Math.abs(dy)) >= maxDelta) break;

                  tag.x = startX + dx;
                  tag.y = startY + dy;

                  if (tag.x + tag.x0 < 0 ||
                    tag.y + tag.y0 < 0 ||
                    tag.x + tag.x1 > size[0] ||
                    tag.y + tag.y1 > size[1]) continue;
                  // TODO only check for collisions within current bounds.
                  if (!bounds || !cloudCollide(tag, board, size[0])) {
                    if (!bounds || collideRects(tag, bounds)) {
                      let sprite = tag.sprite,
                        w = tag.width >> 5,
                        sw = size[0] >> 5,
                        lx = tag.x - (w << 4),
                        sx = lx & 0x7f,
                        msx = 32 - sx,
                        h = tag.y1 - tag.y0,
                        x = (tag.y + tag.y0) * sw + (lx >> 5),
                        last;
                      for (let j = 0; j < h; j++) {
                        last = 0;
                        for (let i = 0; i <= w; i++) {
                          board[x + i] |= (last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0);
                        }
                        x += sw;
                      }
                      delete tag.sprite;
                      return true;
                    }
                  }
                }
                return false;
              }

              cloud.timeInterval = function(_) {
                return arguments.length ? (timeInterval = _ == null ? Infinity : _, cloud) : timeInterval;
              };

              cloud.words = function(_) {
                return arguments.length ? (words = _, cloud) : words;
              };

              cloud.size = function(_) {
                return arguments.length ? (size = [+_[0], +_[1]], cloud) : size;
              };

              cloud.font = function(_) {
                return arguments.length ? (font = functor(_), cloud) : font;
              };

              cloud.fontStyle = function(_) {
                return arguments.length ? (fontStyle = functor(_), cloud) : fontStyle;
              };

              cloud.fontWeight = function(_) {
                return arguments.length ? (fontWeight = functor(_), cloud) : fontWeight;
              };

              cloud.rotate = function(_) {
                return arguments.length ? (rotate = functor(_), cloud) : rotate;
              };

              cloud.text = function(_) {
                return arguments.length ? (text = functor(_), cloud) : text;
              };

              cloud.spiral = function(_) {
                return arguments.length ? (spiral = spirals[_] || _, cloud) : spiral;
              };

              cloud.fontSize = function(_) {
                return arguments.length ? (fontSize = functor(_), cloud) : fontSize;
              };

              cloud.padding = function(_) {
                return arguments.length ? (padding = functor(_), cloud) : padding;
              };

              cloud.random = function(_) {
                return arguments.length ? (random = _, cloud) : random;
              };

              cloud.on = function() {
                let value = event.on.apply(event, arguments);
                return value === event ? cloud : value;
              };

              return cloud;
            };

            function cloudText(d) {
              return d.text;
            }

            function cloudFont() {
              return "serif";
            }

            function cloudFontNormal() {
              return "normal";
            }

            function cloudFontSize(d) {
              return Math.sqrt(d.value);
            }

            function cloudRotate() {
              return (~~(Math.random() * 6) - 3) * 30;
            }

            function cloudPadding() {
              return 1;
            }

            // Fetches a monochrome sprite bitmap for the specified text.
            // Load in batches for speed.
            function cloudSprite(contextAndRatio, d, data, di) {
              if (d.sprite) return;
              let c = contextAndRatio.context,
                ratio = contextAndRatio.ratio;

              c.clearRect(0, 0, (cw << 5) / ratio, ch / ratio);
              let x = 0,
                y = 0,
                maxh = 0,
                n = data.length;
              --di;
              while (++di < n) {
                d = data[di];
                c.save();
                c.font = d.style + " " + d.weight + " " + ~~((d.size + 1) / ratio) + "px " + d.font;
                let w = c.measureText(d.text + "m").width * ratio,
                  h = d.size << 1;
                if (d.rotate) {
                  let sr = Math.sin(d.rotate * cloudRadians),
                    cr = Math.cos(d.rotate * cloudRadians),
                    wcr = w * cr,
                    wsr = w * sr,
                    hcr = h * cr,
                    hsr = h * sr;
                  w = (Math.max(Math.abs(wcr + hsr), Math.abs(wcr - hsr)) + 0x1f) >> 5 << 5;
                  h = ~~Math.max(Math.abs(wsr + hcr), Math.abs(wsr - hcr));
                } else {
                  w = (w + 0x1f) >> 5 << 5;
                }
                if (h > maxh) maxh = h;
                if (x + w >= (cw << 5)) {
                  x = 0;
                  y += maxh;
                  maxh = 0;
                }
                if (y + h >= ch) break;
                c.translate((x + (w >> 1)) / ratio, (y + (h >> 1)) / ratio);
                if (d.rotate) c.rotate(d.rotate * cloudRadians);
                c.fillText(d.text, 0, 0);
                if (d.padding) c.lineWidth = 2 * d.padding, c.strokeText(d.text, 0, 0);
                c.restore();
                d.width = w;
                d.height = h;
                d.xoff = x;
                d.yoff = y;
                d.x1 = w >> 1;
                d.y1 = h >> 1;
                d.x0 = -d.x1;
                d.y0 = -d.y1;
                d.hasText = true;
                x += w;
              }
              let pixels = c.getImageData(0, 0, (cw << 5) / ratio, ch / ratio).data,
                sprite = [];
              while (--di >= 0) {
                d = data[di];
                if (!d.hasText) continue;
                let w = d.width,
                  w32 = w >> 5,
                  h = d.y1 - d.y0;
                // Zero the buffer
                for (let i = 0; i < h * w32; i++) sprite[i] = 0;
                x = d.xoff;
                if (x == null) return;
                y = d.yoff;
                let seen = 0,
                  seenRow = -1;
                for (let j = 0; j < h; j++) {
                  for (let i = 0; i < w; i++) {
                    let k = w32 * j + (i >> 5),
                      m = pixels[((y + j) * (cw << 5) + (x + i)) << 2] ? 1 << (31 - (i % 32)) : 0;
                    sprite[k] |= m;
                    seen |= m;
                  }
                  if (seen) seenRow = j;
                  else {
                    d.y0++;
                    h--;
                    j--;
                    y++;
                  }
                }
                d.y1 = d.y0 + seenRow;
                d.sprite = sprite.slice(0, (d.y1 - d.y0) * w32);
              }
            }

            // Use mask-based collision detection.
            function cloudCollide(tag, board, sw) {
              sw >>= 5;
              let sprite = tag.sprite,
                w = tag.width >> 5,
                lx = tag.x - (w << 4),
                sx = lx & 0x7f,
                msx = 32 - sx,
                h = tag.y1 - tag.y0,
                x = (tag.y + tag.y0) * sw + (lx >> 5),
                last;
              for (let j = 0; j < h; j++) {
                last = 0;
                for (let i = 0; i <= w; i++) {
                  if (((last << msx) | (i < w ? (last = sprite[j * w + i]) >>> sx : 0)) & board[x + i]) return true;
                }
                x += sw;
              }
              return false;
            }

            function cloudBounds(bounds, d) {
              let b0 = bounds[0],
                b1 = bounds[1];
              if (d.x + d.x0 < b0.x) b0.x = d.x + d.x0;
              if (d.y + d.y0 < b0.y) b0.y = d.y + d.y0;
              if (d.x + d.x1 > b1.x) b1.x = d.x + d.x1;
              if (d.y + d.y1 > b1.y) b1.y = d.y + d.y1;
            }

            function collideRects(a, b) {
              return a.x + a.x1 > b[0].x && a.x + a.x0 < b[1].x && a.y + a.y1 > b[0].y && a.y + a.y0 < b[1].y;
            }

            function archimedeanSpiral(size) {
              let e = size[0] / size[1];
              return function(t) {
                return [e * (t *= .1) * Math.cos(t), t * Math.sin(t)];
              };
            }

            function rectangularSpiral(size) {
              let dy = 4,
                dx = dy * size[0] / size[1],
                x = 0,
                y = 0;
              return function(t) {
                let sign = t < 0 ? -1 : 1;
                // See triangular numbers: T_n = n * (n + 1) / 2.
                switch ((Math.sqrt(1 + 4 * sign * t) - sign) & 3) {
                case 0:
                  x += dx;
                  break;
                case 1:
                  y += dy;
                  break;
                case 2:
                  x -= dx;
                  break;
                default:
                  y -= dy;
                  break;
                }
                return [x, y];
              };
            }

            // TODO reuse arrays?
            function zeroArray(n) {
              let a = [],
                i = -1;
              while (++i < n) a[i] = 0;
              return a;
            }

            function cloudCanvas() {
              return document.createElement("canvas");
            }

            function functor(d) {
              return typeof d === "function" ? d : function() { return d; };
            }

            let spirals = {
              archimedean: archimedeanSpiral,
              rectangular: rectangularSpiral
            };

          }, { "d3-dispatch": 2 }
        ],
        2: [
          function(require, module, exports) {
            // https://d3js.org/d3-dispatch/ Version 1.0.2. Copyright 2016 Mike Bostock.
            (function(global, factory) {
              typeof exports === 'object' && typeof module !== 'undefined'
                ? factory(exports)
                : typeof define === 'function' && define.amd
                ? define(['exports'], factory)
                : (factory((global.d3 = global.d3 || {})));
            }(this,
              (function(exports) {
                'use strict';

                let noop = { value: function() {} };

                function dispatch() {
                  let _ = {};
                  for (let i = 0, n = arguments.length, t; i < n; ++i) {
                    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
                    _[t] = [];
                  }
                  return new Dispatch(_);
                }

                function Dispatch(_) {
                  this._ = _;
                }

                function parseTypenames(typenames, types) {
                  return typenames.trim().split(/^|\s+/).map(function(t) {
                    let name = "", i = t.indexOf(".");
                    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
                    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
                    return { type: t, name: name };
                  });
                }

                Dispatch.prototype = dispatch.prototype = {
                  constructor: Dispatch,
                  on: function(typename, callback) {
                    let _ = this._,
                      T = parseTypenames(typename + "", _),
                      t,
                      i = -1,
                      n = T.length;

                    // If no callback was specified, return the callback of the given type and name.
                    if (arguments.length < 2) {
                      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
                      return;
                    }

                    // If a type was specified, set the callback for the given type and name.
                    // Otherwise, if a null callback was specified, remove callbacks of the given name.
                    if (callback != null && typeof callback !== "function")
                      throw new Error("invalid callback: " + callback);
                    while (++i < n) {
                      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
                      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
                    }

                    return this;
                  },
                  copy: function() {
                    let copy = {}, _ = this._;
                    for (let t in _) copy[t] = _[t].slice();
                    return new Dispatch(copy);
                  },
                  call: function(type, that) {
                    let n, t, i = 0, args;
                    if ((n = arguments.length - 2) > 0)
                      for (args = new Array(n); i < n; ++i) args[i] = arguments[i + 2];
                    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
                    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
                  },
                  apply: function(type, that, args) {
                    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
                    for (let t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
                  }
                };

                function get(type, name) {
                  for (let i = 0, n = type.length, c; i < n; ++i) {
                    if ((c = type[i]).name === name) {
                      return c.value;
                    }
                  }
                }

                function set(type, name, callback) {
                  for (let i = 0, n = type.length; i < n; ++i) {
                    if (type[i].name === name) {
                      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
                      break;
                    }
                  }
                  if (callback != null) type.push({ name: name, value: callback });
                  return type;
                }

                exports.dispatch = dispatch;

                Object.defineProperty(exports, '__esModule', { value: true });

              })));

          }, {}
        ]
      },
      {},
      [1])(1)
  });


  let rangeOfTagCloud = [20, 60];

  this.drawCloud = function(data, divId) {

    let margin = { top: 0, right: 20, bottom: 20, left: 0 };


    let cloudDiv = d3.select("#" + divId);

    function deletePx(str) {
      return +str.slice(0, str.length - 2);
    }

    let width = deletePx(cloudDiv.style("width")) - margin.left - margin.right,
      height = deletePx(cloudDiv.style("height")) - margin.top - margin.bottom;

    cloudDiv.select("svg").remove();

    let g = cloudDiv.append("svg").attr("width", width).attr("height", height)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    let color = d3.scaleOrdinal(d3.schemeCategory10);
    let categories = d3.keys(d3.nest().key(function(d) { return d.score; }).map(data));
    let fontSize = d3.scalePow().exponent(2)
      .domain(d3.extent(data, function(d) { return d.score; }))
      .range(rangeOfTagCloud);

    let layout = d3.layout.cloud()
      .size([width, height])
      .timeInterval(20)
      .words(data)
      .rotate(function(d) { return 0; })
      .fontSize(function(d, i) { return fontSize(d.score); })
      //.fontStyle(function(d,i) { return fontSyle(Math.random()); })
      .fontWeight(["bold"])
      .text(function(d) { return d.title; })
      .spiral("archimedean") // "archimedean" or "rectangular"
      .on("end", draw)
      .start();

    let wordcloud = g.append("g")
      .attr('class', 'wordcloud')
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + height + ")")
      .selectAll('text')
      .style('font-size', '20px')
      .style('fill', function(d) { return color(d); })
      .style('font', 'sans-serif');

    function draw(words) {
      wordcloud.selectAll("text")
        .data(words)
        .enter().append("a")
        .attr("id", "tags-elements")
        .attr("href", function(d) { return d.link; })
        // .style("display", "inline-block")
        // .classed("well", true)
        // .attr("font-size", "11px")
        .append("text")
        .attr('class', 'word')
        .style("fill", function(d, i) { return color(i); })
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", function(d) { return d.font; })
        //.style("fill", function(d) { 
        //let paringObject = data.filter(function(obj) { return obj.Team_CN === d.text});
        // return color(paringObject[0].category); 
        //})
        .attr("text-anchor", "middle")
        .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
        .text(function(d) { return d.text; });
    }
  };
}