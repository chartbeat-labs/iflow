if (!goog) {
  var goog = {};
  goog.inherits = function(childCtor, parentCtor) {
    /** @constructor */
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  };
}

function Util() {}
Util.getTime = function() {
  return (new Date).getTime();
}

/**
 * @constructor
 */
function Scene(ctx) {
  this.actors = [];
  this.ctx = ctx;
  this.mouse = { x:0, y:0 };
}

Scene.prototype.remove = function(actor) {
  var doomed = this.actors.indexOf(actor);
  if (doomed == -1) return;
  actor.destroy();
  this.actors.splice(doomed, 1);
};
Scene.prototype.push = function(actor) {
  actor.scene = this;
  this.actors.push(actor);
};
Scene.prototype.getActors = function(type) {
  return type ? this.actors.filter(function(actor) {
    return actor instanceof type;
  }) : this.actors;
};

Scene.prototype.draw = function() {
  this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  this.ctx.canvas.style.cursor = "auto";
  this.actors.forEach(function(actor) {
    actor.draw(this.ctx);
  }, this);
};


/**
 * @constructor
 */
function Actor() {
  this.properties = {};
}

Actor.prototype = {}

Actor.prototype.destroy = function() {};

Actor.prototype.draw = function(ctx) {};

Actor.prototype.setProperty = function(name, value, transition) {
  this.properties[name] = {
    ts: Util.getTime(),
    prev: this.properties[name] ? this.getProperty(name) : undefined,
    value: value,
    transition: transition
  }
};

Actor.prototype.getProperty = function(name) {
  var prop = this.properties[name];
  if (!prop) {
    return undefined;
  }
  // currently we only interpolate numbers
  if (typeof prop.value !== 'number') {
    return prop.value;
  }
  if (!prop.transition || prop.prev === undefined) {
    return prop.value;
  }

  var elapsed = Util.getTime() - prop.ts;
  var capped_elapsed = Math.min(prop.transition.duration, elapsed);

  if (capped_elapsed == prop.transition.duration && prop.transition.repeat) {
    prop.ts = Util.getTime();
    capped_elapsed = 0;
  }
  var diff = prop.value - prop.prev;
  var current = prop.transition.fn(capped_elapsed, prop.prev, diff, prop.transition.duration);

  return current;
};

Actor.prototype.setProperties = function(props, transition) {
  for (var p in props) {
    this.setProperty(p, props[p], transition);
  }
  if (this.onPropertiesChanged) {
    this.onPropertiesChanged(props);
  }
};

Actor.prototype.getProperties = function() {
  var rv = {};
  for (var p in this.properties) {
    rv[p] = this.getProperty(p);
  }
  return rv;
};
