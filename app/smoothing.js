// app/smoothing.js

export const SmoothingModes = {
  adaptiveEMA: (newVal, prevVal, options = {}) => {
    const delta = Math.abs(newVal - prevVal);
    const alpha = Math.max(0.1, 1 / (1 + delta * (options.sensitivity || 1)));
    return alpha * newVal + (1 - alpha) * prevVal;
  },

  springDamper: (() => {
    let velocity = 0;
    return (target, current, options = {}) => {
      const k = options.stiffness ?? 0.2;
      const d = options.damping  ?? 0.7;
      const disp = target - current;
      velocity += k * disp;
      velocity *= d;
      return current + velocity;
    };
  })(),

  passthrough: (v) => v  // no smoothing
};
