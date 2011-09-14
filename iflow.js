$(document).ready(init);
$(window).resize(resize);
var session = window.location.hash.substring(1);
var API = {
  DASH: '/api/dash/?'+session+'&v=2&newsbeat=1&types=1&sort_by&referrer&count=10'
}

function resize() {
  $("canvas").attr("width", window.innerWidth - 100).attr("height", window.innerHeight - 100);
}

function fixEventOffset(event) {
  event.offsetX = event.pageX - $(event.currentTarget).offset().left;
  event.offsetY = event.pageY - $(event.currentTarget).offset().top;
}

var centeredCircle;
var selectedCircle;
var hoveredCircle;
var scene;

var maxNowOnNum = 0;
var currentData;
var firstLoad = true;


var lineAlpha = .08;
var textAlpha = .3;
var COLOR = {
  INCOMING: "rgba(238, 42, 96, 0.8)",
  OUTGOING: "rgba(48, 114, 185, 0.8)"
}

var textColor = "0,0,0";
var lineColor = "0,0,0";
var backgroundColor = "white";
COLORS = [
  "rgba(48, 114, 185, 0.8)",
  "rgba(0,0,0,0.05)"
];


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

var lines;

function initData(scene) {
  var canvas = scene.ctx.canvas;
  lines = new Lines()
  scene.push(lines);

  function requestTopPages() {
    $.getJSON(API.DASH + "&rnd=" + Util.getTime(), onDashResponse)
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


function Circle() {
  Actor.call(this);
  this.slices_ = [];
}
goog.inherits(Circle, Actor);

Circle.prototype.draw = function(ctx) {
  Actor.prototype.draw.call(this, ctx);

  ctx.save();

  this.slices_.forEach(function(slice, index) {
    slice.draw(ctx);
  });
  ctx.save();


  ctx.translate(this.getProperty('x'), this.getProperty('y') + 2);
  ctx.rotate(Math.PI*this.getProperty('rotation'));
  ctx.translate(this.getProperty('radius') + this.getProperty('width')*2, 0);
  //ctx.translate(-this.getProperty('radius')/2, -this.getProperty('radius')/2);
  ctx.fillStyle = "rgba("+textColor+","+(hoveredCircle==this?1:textAlpha)+")";
  ctx.font = (0&&this.landing ? "bold " : "")+"10pt Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // ctx.fillText(this.data.title.substring(this.data.title.length -40), 0,0)
  var title = hoveredCircle == this || centeredCircle == this ? this.data.title : this.data.title.substring(0, 40) + " ..."
  ctx.fillText(title, 0,0)
  ctx.restore();
  ctx.restore();
  if (!this.data['stats']['now_on']) {
    return;
  }

  var p = this.getProperties();
  ctx.arc(p.x, p.y, p.radius + p.width + 10, 0, Math.PI * 2, false);
  this.hovered = ctx.isPointInPath(this.scene.mouse.x, this.scene.mouse.y);
  if (this.hovered) {
    hoveredCircle = this;
    ctx.canvas.style.cursor = "pointer";
  } else if (hoveredCircle == this){
//    hoveredCircle = null;
  }
  ctx.closePath();



};

Circle.prototype.onPropertiesChanged = function(props) {
  var data = this.getProperty('data');
  var total = data.reduce(function(p, c) { return p + c; }, 0);

  if (this.slices_.length != data.length) {
    this.slices_ = [];
  }

  data.forEach(function(p, index) {
    var slice = this.slices_[index];
    if (!slice) {
      slice = new Slice(this);
      this.slices_.push(slice);
    }

    var start = data.reduce(function(p, c, i) {
      return i < index ? p + c : p;
    }, 0) / total;
    var end = p / total + start;
    var color = COLORS[index]; //this landing

    slice.setProperties({
      start: start,
      end: end
    }, this.sliceTransition);
    slice.setProperties({ color: color });

  }, this);
};

function Lines() {
  Actor.call(this);
}
goog.inherits(Lines, Actor);

Lines.prototype.draw = function(ctx) {
  ctx.save();
//  ctx.globalCompositeOperation = "destination-over";
  scene.getActors(Circle).forEach(function(circle) {
    circle.data['stats']['now_on'].forEach(function(now){
      var to = findCircleByPath(scene, now.path);
      if (!to) {
        return;
      }
      var highlight = to == centeredCircle || circle == centeredCircle;
      ctx.save();
      ctx.beginPath();
      var alpha = Math.max(0.2, now.num / maxNowOnNum);
      ctx.strokeStyle = ctx.fillStyle = "rgba("+lineColor+", "+alpha+")";
      ctx.lineWidth = alpha * 7; //now.num;
      // ctx.lineWidth = 4;
      var f = circle.getProperties();
      var t = to.getProperties();
      ctx.moveTo(f.x, f.y);
      //ctx.lineTo(, to.getProperty('y'));
      var d = {
        x: f.x + (t.x - f.x) / 2,
        y:Math.max((f.y + -Math.abs(t.x - f.x)) / 3,-80)
      }
      //ctx.quadraticCurveTo(-d, -d, t.x, t.y);
  //    ctx.strokeStyle = ctx.fillStyle = highlight ? (this == hoveredCircle ?
  //        COLOR.OUTGOING : COLOR.INCOMING) : "rgba("+lineColor+", "+(hoveredCircle ? lineAlpha: alpha)+")";
      ctx.strokeStyle = ctx.fillStyle = highlight ? (circle == hoveredCircle ?
          COLOR.OUTGOING : COLOR.INCOMING) : "rgba("+lineColor+", "+(hoveredCircle ? lineAlpha: alpha)+")";
      ctx.lineCap = "round";
      ctx.bezierCurveTo(f.x, f.y, d.x, d.y, t.x, t.y);
      ctx.stroke();

      var ants = circle.getProperty('ants') + circle.random + to.random;
      while (ants > 1) ants -= 1;
      if (highlight) {
        var p = getBezierPoint(1-ants, f, f, d, t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(3, alpha * 8), 0, Math.PI * 2, false);
        ctx.fill();
      }

      ctx.restore();
    }, this);
  }, this);
  ctx.restore();
}

function Slice(parent) {
  Actor.call(this);
  this.parent = parent;
}
goog.inherits(Slice, Actor);

Slice.prototype.draw = function(ctx) {
  ctx.save();
  ctx.beginPath();

  var pp = this.parent.getProperties();
  var p = this.getProperties();

  ctx.arc (pp.x, pp.y, pp.radius + pp.width, Math.PI * 2 * p.start, Math.PI * 2 * p.end, false);
  ctx.arc(pp.x, pp.y, pp.radius, Math.PI * 2 * p.end, Math.PI * 2 * p.start, true);
  ctx.closePath();
  //ctx.closePath();
  //this.parent.hovered = ctx.isPointInPath(this.parent.scene.mouse.x, this.parent.scene.mouse.y);
  ctx.strokeStyle = ctx.fillStyle = p.color;
  //ctx.globalAlpha = 0.8;
  //ctx.stroke();
  ctx.fill();
  ctx.restore();
};

