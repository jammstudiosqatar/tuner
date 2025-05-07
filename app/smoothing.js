export const SmoothingModes = {
  adaptiveEMA: (newVal, prevVal, options) => {
    const delta = Math.abs(newVal - prevVal);
    const alpha = Math.max(0.1, 1 / (1 + delta * (options?.sensitivity || 1)));
    return alpha * newVal + (1 - alpha) * prevVal;
  },

  springDamper: (() => {
    let velocity = 0;
    return (target, current, options = {}) => {
      const stiffness = options.stiffness || 0.2;
      const damping = options.damping || 0.7;
      const displacement = target - current;
      velocity += stiffness * displacement;
      velocity *= damping;
      return current + velocity;
    };
  })(),

  passthrough: (newVal) => newVal, // No smoothing
};
