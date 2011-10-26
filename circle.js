/**
 * @constructor
 */
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

  var alpha = (hoveredCircle==this?1:config['text_alpha']);
  var title = hoveredCircle == this || centeredCircle == this ? this.data.title : this.data.title.substring(0, 40) + " ..."

  ctx.translate(this.getProperty('x'), this.getProperty('y') + 2);
  ctx.rotate(Math.PI*this.getProperty('rotation'));
  ctx.translate(this.getProperty('radius') + this.getProperty('width')*2, 0);
  ctx.fillStyle = replaceAlpha(config['text_color'], alpha);
  ctx.font = (0&&this.landing ? "bold " : "")+"10pt Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
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
    slice.setProperties({
      start: start,
      end: end
    }, this.sliceTransition);
    slice.setProperties({ color: !index ? config['incoming_color'] : config['outgoing_color'] });

  }, this);
};


/**
 * @constructor
 */
function Lines() {
  Actor.call(this);
}
goog.inherits(Lines, Actor);

Lines.prototype.draw = function(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
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
      ctx.strokeStyle = ctx.fillStyle = replaceAlpha(config['line_color'], alpha);
      ctx.lineWidth = alpha * 7;
      var f = circle.getProperties();
      var t = to.getProperties();
      ctx.moveTo(f.x, f.y);
      var d = {
        x: f.x + (t.x - f.x) / 2,
        y:Math.max((f.y + -Math.abs(t.x - f.x)) / 3,-80)
      }
      ctx.strokeStyle = ctx.fillStyle = highlight ? (circle == hoveredCircle ?
          config['outgoing_color'] : config['incoming_color']) : "rgba("+config['line_color']+", "+(hoveredCircle ? config['line_alpha']: alpha)+")";
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

/**
 * @constructor
 */
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
  ctx.strokeStyle = ctx.fillStyle = p.color;
  ctx.fill();
  ctx.restore();
};