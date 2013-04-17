$(document).ready(init);

var DASH_API = '//api.chartbeat.com/dash/?apikey=%apikey' +
               '&host=%host&v=2&newsbeat=1&types=1&sort_by&referrer&count=10';

var centeredCircle;
var selectedCircle;
var hoveredCircle;
var scene;
var maxNowOnNum = 0;
var currentData;
var firstLoad = true;
var lines;

// default config
var config = {
  'incoming_color':   'rgba(48, 114, 185, 0.8)',
  'outgoing_color':   'rgba(238, 42, 96, 0.8)',
  'deselected_color': 'rgba(0, 0, 0, 0.05)',
  'line_color':       'rgba(0, 0, 0, %alpha)',
  'text_color':       'rgba(0, 0, 0, %alpha)',
  'text_alpha':       .3,
  'line_alpha':       .08
}

// override with config.js
for (var prop in window['iflow_config']) {
  config[prop] = window['iflow_config'][prop];
}

// override again with url params
var params = window.location.search.substring(1).split('&');
for (var i = 0, param; param = params[i]; ++i) {
  var arr = param.split('=');
  if (arr[0]) {
    config[arr[0]] = arr[1];
  }
}

//////////////////////////////////////////////////////////////////////////////

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

function resize() {
  $("canvas").attr("width", window.innerWidth - 100).attr("height", window.innerHeight - 100);
}

function replaceAlpha(color, alpha) {
  return color.replace('%alpha', alpha);
}

function fixEventOffset(event) {
  event.offsetX = event.pageX - $(event.currentTarget).offset().left;
  event.offsetY = event.pageY - $(event.currentTarget).offset().top;
}

function findCircleByPath(scene, path) {
  var circles = scene.getActors(Circle);
  for (var i = 0; i < circles.length; ++i) {
    if (circles[i].data && circles[i].data.path == path) {
      return circles[i];
    }
  }
}

function circlePoints(points, radius, x, y) {
  var rv = [];
  var slice = 1 * Math.PI / points;
  for (var i = 0; i < points; i++) {
    var angle = slice * i;
    rv.push({
      x: x + radius * Math.cos(angle),
      y: y + radius * Math.sin(angle)
    })
  }
  return rv;
}

function B1(t) { return t*t*t }
function B2(t) { return 3*t*t*(1-t) }
function B3(t) { return 3*t*(1-t)*(1-t) }
function B4(t) { return (1-t)*(1-t)*(1-t) }

function getBezierPoint(percent, C1, C2, C3, C4) {
  return {
    x: C1.x*B1(percent) + C2.x*B2(percent) + C3.x*B3(percent) + C4.x*B4(percent),
    y: C1.y*B1(percent) + C2.y*B2(percent) + C3.y*B3(percent) + C4.y*B4(percent)
  }
}


function filterNonReferencedPages(pages) {
  return pages;
}

function moveStuff() {
 if (!currentData) {
   return;
 }
 var pages = filterNonReferencedPages(currentData['toppages']).slice(0, 15);

 var total = pages.reduce(function(p, c){
   return p + c['stats']['people'];
 }, 0);
 var lpCount = 0;
 var articleCount = 0;
 maxNowOnNum = pages.reduce(function(p, c){
    var max = c['stats']['now_on'].reduce(function(p, c) {
      return c.num > p ? c.num : p;
    }, 0);
    return max > p ? max : p;
  }, 0);
 pages.forEach(function(page, i) {
   var circles = scene.getActors(Circle);
   var index = circles.reduce(function(p, c, i){
     return c.data.path == page.path ? i : p;
   }, -1);
   var circle = circles[index];
   var s = page['stats'];
   if (index == -1) {
     circle = new Circle();
     circle.data = page;
     circle.sliceTransition = new Transition(1000);
     circle.setProperty('ants', 0);
     circle.setProperty('rotation', 0.2);
     circle.landing = (s['type'] == "LandingPage");
     circle.random = Math.random();
     circle.setProperty('ants', 1, new Transition(2000, Transition.linear, true));
     scene.push(circle);

     //scene.remove(lines);
     //scene.push(lines);
   }
   var stat = 'internal';//'new';
   var data = [s[stat], s['people'] - s[stat]];
   var size = (s['people'] / total) * 30 + 5;
   var pos = {
     x: 50 + (scene.ctx.canvas.width - 100) * (i / pages.length),
     y: scene.ctx.canvas.height / 2
   };
   if (firstLoad && circle.landing) {
     centeredCircle = hoveredCircle = circle;
     firstLoad = false;
   }
   if (centeredCircle == circle) {
     pos.x = scene.ctx.canvas.width / 2;
     pos.y = 100;
   }
   circle.setProperties({
     data: data,
     width: size / 1.5,
     radius: size
   }, new Transition(2000, Transition.easeOut));
   var y = circle.getProperty('y');
   if (y == undefined) y = 10000;
   if (circle != selectedCircle && circle != centeredCircle) {
     circle.setProperties({
       x: pos.x,
       y: pos.y,
       rotation: 0.3
     }, new Transition(500));
   } else {
     circle.setProperties({
       x: pos.x,
       y: pos.y,
       rotation: 0
     }, new Transition(500));
   }
   if (y > 290) {
     circle.setProperties({
       x: pos.x,
       y: pos.y
     }, new Transition(500));
   }
 });
 scene.getActors(Circle).forEach(function(ref){
   if(!pages.some(function(page){
     return page.path == ref.data.path;
   })) {
     scene.remove(ref);
   }
 });
 if (firstLoad) {
   firstLoad = false;
 }

}

function initData(scene) {
  var canvas = scene.ctx.canvas;
  lines = new Lines()
  scene.push(lines);

  function requestTopPages() {
    var url = DASH_API.replace(/%host/g, config['host'])
                      .replace(/%apikey/g, config['apikey'])
    url += "&rnd=" + Util.getTime();
    $.getJSON(url, onDashResponse)
  }
  setInterval(requestTopPages, 2000);
  requestTopPages();
}

function onDashResponse( data) {
  currentData = data;
  moveStuff();
}

function init(){
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  scene = new Scene(ctx);
  $(window).resize(resize);
  resize();

  function clickCircle(circle) {
    if (centeredCircle == circle) {
      centeredCircle = null;
    } else {
      centeredCircle = circle;
      if (centeredCircle){
        scene.remove(centeredCircle);
        scene.push(centeredCircle);
      }
    }
    moveStuff();
  }

  $(canvas).mousemove(function(event) {
    fixEventOffset(event);
    scene.mouse = {
      x: event.offsetX,
      y: event.offsetY
    }
    if (selectedCircle) {
      selectedCircle.setProperties(scene.mouse);
    }
  });
  var originalPosition = {
    x: 0,
    y: 0
  }
  $(canvas).click(function(event) {
    fixEventOffset(event);
    var clickedCircle;
    if (originalPosition.x != event.offsetX || originalPosition.y != event.offsetY) {
      return;
    }
    scene.getActors(Circle).some(function(circle) {
      if (circle.hovered) {
        clickedCircle = circle;
        return true
      }
    });
    clickCircle(clickedCircle);
  });
  $(canvas).mousedown(function(event) {
    fixEventOffset(event);
    originalPosition = {
      x: event.offsetX,
      y: event.offsetY
    }
    var outside = true;
    scene.getActors(Circle).forEach(function(circle) {
      if (circle.hovered) {
        outside = false;
        selectedCircle = circle;
      }
    });
    if (outside) {
      hoveredCircle = null;
      selectedCircle = null;
    }
    if (!selectedCircle) {
      return;
    }
    $(document).mouseup(function() {
      selectedCircle = null;
      moveStuff();
    });
  });

  function draw(time) {
    scene.draw(time);
    window.requestAnimFrame(draw, canvas);
  }
  window.requestAnimFrame(draw, canvas);
  initData(scene);
}

