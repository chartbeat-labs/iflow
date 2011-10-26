/**
 * @constructor
 */
function Transition(duration, fn, repeat) {
  this.duration = duration || 2000;
  this.repeat = repeat || false;
  this.fn = fn || Transition.linear;
}

Transition.linear = function(t, b, c, d) {
    return Math.min(1, t / d) * c + b;
};

Transition.easeOut = function(t, b, c, d) {
  if ((t /= d) < (1 / 2.75))
    return c * (7.5625 * t * t) + b;
  else if (t < (2 / 2.75))
    return c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
  else if (t < (2.5 / 2.75))
    return c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
  else
    return c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
}

Transition.easeOutBounce = function(t, b, c, d) {
  if ((t /= d) < (1 / 2.75)) {
      return c * (7.5625 * t * t) + b;
  } else if (t < (2 / 2.75)) {
      return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
  } else if (t < (2.5 / 2.75)) {
      return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
  } else {
      return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
  }
};
