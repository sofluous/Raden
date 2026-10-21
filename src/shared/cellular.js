/* Deterministic jittered cellular-field sampling shared by procedural modes. */
(function registerRadenCellular(global) {
  function hash2(x, y, seed) {
    const n =
      Math.sin((x * 127.1 + y * 311.7 + seed * 0.0001) * 1.0) *
      43758.5453123;
    return n - Math.floor(n);
  }

  function sampleCellularField(x, y, cellScale, seed) {
    const px = x * cellScale;
    const py = y * cellScale;
    const cx = Math.floor(px);
    const cy = Math.floor(py);
    let nearest = Infinity;
    let second = Infinity;
    let nearestX = 0;
    let nearestY = 0;
    let nearestId = 0;

    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox;
        const gy = cy + oy;
        const jitterX = hash2(gx, gy, seed) - 0.5;
        const jitterY = hash2(gx + 13.2, gy - 8.4, seed + 17) - 0.5;
        const fx = gx + 0.5 + jitterX * 0.82;
        const fy = gy + 0.5 + jitterY * 0.82;
        const dx = px - fx;
        const dy = py - fy;
        const dist = Math.hypot(dx, dy);
        if (dist < nearest) {
          second = nearest;
          nearest = dist;
          nearestX = fx;
          nearestY = fy;
          nearestId = hash2(gx - 4.1, gy + 6.7, seed + 31);
        } else if (dist < second) {
          second = dist;
        }
      }
    }

    return {
      nearest,
      second,
      edge: Math.max(0, second - nearest),
      cellX: nearestX,
      cellY: nearestY,
      cellId: nearestId,
    };
  }

  global.RadenCellular = Object.assign({}, global.RadenCellular || {}, {
    hash2,
    sampleCellularField,
  });
})(window);
