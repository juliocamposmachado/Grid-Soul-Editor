const MIN_DETAIL = 12;
const MAX_DETAIL = 64;
const MAX_GRID_CELLS = 90_000;
const MAX_TRIANGLES = 260_000;

export function clampMeshDetail(value, fallback = 36) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.round(Math.max(MIN_DETAIL, Math.min(MAX_DETAIL, numeric)))
    : fallback;
}

function addIndexedTriangle(indices, a, b, c) {
  indices.push(a, b, c);
}

export function createUvSphereGeometry(THREE, detail = 32, radii = [1, 1, 1]) {
  const segments = clampMeshDetail(detail, 32);
  const rings = Math.max(8, Math.round(segments * 0.62));
  const positions = [0, radii[1], 0];
  const indices = [];
  for (let row = 1; row < rings; row++) {
    const v = row / rings;
    const phi = Math.PI * v;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let col = 0; col < segments; col++) {
      const theta = (col / segments) * Math.PI * 2;
      positions.push(
        Math.cos(theta) * sinPhi * radii[0],
        cosPhi * radii[1],
        Math.sin(theta) * sinPhi * radii[2]
      );
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, -radii[1], 0);
  for (let col = 0; col < segments; col++) {
    const next = (col + 1) % segments;
    addIndexedTriangle(indices, 0, 1 + next, 1 + col);
  }
  for (let row = 0; row < rings - 2; row++) {
    const first = 1 + row * segments;
    const nextRow = first + segments;
    for (let col = 0; col < segments; col++) {
      const next = (col + 1) % segments;
      const a = first + col;
      const b = first + next;
      const c = nextRow + next;
      const d = nextRow + col;
      addIndexedTriangle(indices, a, b, d);
      addIndexedTriangle(indices, b, c, d);
    }
  }
  const lastRing = 1 + (rings - 2) * segments;
  for (let col = 0; col < segments; col++) {
    const next = (col + 1) % segments;
    addIndexedTriangle(indices, bottom, lastRing + col, lastRing + next);
  }
  return finalizeGeometry(THREE, positions, indices);
}

export function createTorusGeometry(THREE, detail = 32, majorRadius = 0.9, tubeRadius = 0.28) {
  const around = clampMeshDetail(detail, 32);
  const tube = Math.max(8, Math.round(around * 0.42));
  const positions = [];
  const indices = [];
  for (let i = 0; i < around; i++) {
    const u = (i / around) * Math.PI * 2;
    for (let j = 0; j < tube; j++) {
      const v = (j / tube) * Math.PI * 2;
      const ring = majorRadius + tubeRadius * Math.cos(v);
      positions.push(ring * Math.cos(u), tubeRadius * Math.sin(v), ring * Math.sin(u));
    }
  }
  for (let i = 0; i < around; i++) {
    const nextI = (i + 1) % around;
    for (let j = 0; j < tube; j++) {
      const nextJ = (j + 1) % tube;
      const a = i * tube + j;
      const b = nextI * tube + j;
      const c = nextI * tube + nextJ;
      const d = i * tube + nextJ;
      addIndexedTriangle(indices, a, b, d);
      addIndexedTriangle(indices, b, c, d);
    }
  }
  return finalizeGeometry(THREE, positions, indices);
}

export function createHeightFieldGeometry(THREE, detail = 36, kind = 'wave') {
  const segments = clampMeshDetail(detail, 36);
  const positions = [];
  const indices = [];
  for (let row = 0; row <= segments; row++) {
    const z = (row / segments - 0.5) * 3.4;
    for (let col = 0; col <= segments; col++) {
      const x = (col / segments - 0.5) * 3.4;
      const nx = x / 1.7;
      const nz = z / 1.7;
      let y;
      if (kind === 'terrain') {
        const peak = (cx, cz, sx, sz) => Math.exp(-(((nx - cx) ** 2) / sx + ((nz - cz) ** 2) / sz));
        y = -0.08 + 0.16 * Math.sin(nx * 5.5 + nz * 2.2) * Math.cos(nz * 4.8 - nx * 1.4)
          + 0.78 * peak(-0.42, -0.22, 0.10, 0.18)
          + 0.92 * peak(0.18, 0.10, 0.075, 0.11)
          + 0.62 * peak(0.62, -0.48, 0.12, 0.10)
          + 0.48 * peak(-0.15, 0.62, 0.20, 0.12);
      } else {
        y = 0.24 * Math.sin(x * 2.2 + z * 1.7) + 0.10 * Math.cos(z * 3.1 - x * 1.3);
      }
      positions.push(x, y, z);
    }
  }
  const rowSize = segments + 1;
  for (let row = 0; row < segments; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * rowSize + col;
      const b = a + 1;
      const c = a + rowSize + 1;
      const d = a + rowSize;
      addIndexedTriangle(indices, a, d, b);
      addIndexedTriangle(indices, b, d, c);
    }
  }
  return finalizeGeometry(THREE, positions, indices);
}

export function createSpiralTubeGeometry(THREE, detail = 36) {
  const segments = clampMeshDetail(detail, 36);
  const radial = Math.max(6, Math.round(segments * 0.22));
  const steps = Math.max(segments * 3, 42);
  const positions = [];
  const indices = [];
  const centers = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 6;
    const radius = 0.16 + t * 1.0;
    centers.push([radius * Math.cos(angle), (t - 0.5) * 3.2, radius * Math.sin(angle)]);
  }
  for (let i = 0; i <= steps; i++) {
    const center = centers[i];
    const before = centers[Math.max(0, i - 1)];
    const after = centers[Math.min(steps, i + 1)];
    const tx = after[0] - before[0];
    const ty = after[1] - before[1];
    const tz = after[2] - before[2];
    const length = Math.hypot(tx, ty, tz) || 1;
    const tangent = [tx / length, ty / length, tz / length];
    let normal = [-tangent[2], 0, tangent[0]];
    let normalLength = Math.hypot(...normal) || 1;
    normal = normal.map(value => value / normalLength);
    let binormal = [
      tangent[1] * normal[2] - tangent[2] * normal[1],
      tangent[2] * normal[0] - tangent[0] * normal[2],
      tangent[0] * normal[1] - tangent[1] * normal[0]
    ];
    normalLength = Math.hypot(...binormal) || 1;
    binormal = binormal.map(value => value / normalLength);
    for (let j = 0; j < radial; j++) {
      const angle = (j / radial) * Math.PI * 2;
      const radius = 0.045 + 0.045 * (1 - i / steps);
      const ca = Math.cos(angle) * radius;
      const sa = Math.sin(angle) * radius;
      positions.push(
        center[0] + normal[0] * ca + binormal[0] * sa,
        center[1] + normal[1] * ca + binormal[1] * sa,
        center[2] + normal[2] * ca + binormal[2] * sa
      );
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const nextJ = (j + 1) % radial;
      const a = i * radial + j;
      const b = i * radial + nextJ;
      const c = (i + 1) * radial + nextJ;
      const d = (i + 1) * radial + j;
      addIndexedTriangle(indices, a, b, d);
      addIndexedTriangle(indices, b, c, d);
    }
  }
  return finalizeGeometry(THREE, positions, indices);
}

function pointSegmentDistance2D(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function polygonSignedDistance(x, y, polygon) {
  let inside = false;
  let minimum = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi) inside = !inside;
    minimum = Math.min(minimum, pointSegmentDistance2D(x, y, xi, yi, xj, yj));
  }
  return inside ? -minimum : minimum;
}

function ellipsoidDistance(x, y, z, cx, cy, cz, rx, ry, rz) {
  const qx = (x - cx) / rx;
  const qy = (y - cy) / ry;
  const qz = (z - cz) / rz;
  const k0 = Math.hypot(qx, qy, qz);
  const k1 = Math.hypot(qx / rx, qy / ry, qz / rz) || 1;
  return k0 * (k0 - 1) / k1;
}

function boxDistance(x, y, z, cx, cy, cz, hx, hy, hz) {
  const qx = Math.abs(x - cx) - hx;
  const qy = Math.abs(y - cy) - hy;
  const qz = Math.abs(z - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0))
    + Math.min(Math.max(qx, qy, qz), 0);
}

function cylinderDistanceY(x, y, z, cx, cy, cz, radius, halfHeight) {
  const dx = Math.hypot(x - cx, z - cz) - radius;
  const dy = Math.abs(y - cy) - halfHeight;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}

function sharkDistance(x, y, z) {
  const t = Math.max(0, Math.min(1, (x + 1.62) / 2.75));
  const taper = Math.max(0.035, Math.sin(Math.PI * (0.06 + t * 0.88)) ** 0.72);
  const ry = 0.56 * taper * (0.88 + 0.16 * Math.exp(-((x + 0.42) ** 2) / 0.18));
  const rz = 0.39 * taper;
  let distance = ellipsoidDistance(x, y, z, 0, 0, 0, 1.38, ry, rz);
  const dorsal = [[-0.12, 0.31], [0.20, 1.02], [0.36, 0.39], [0.66, 0.23]];
  distance = Math.min(distance, Math.max(polygonSignedDistance(x, y, dorsal), Math.abs(z) - 0.11));
  const tail = [[1.03, 0.08], [1.23, 0.12], [1.68, 0.78], [1.48, 0.10], [1.47, -0.08], [1.61, -0.70], [1.22, -0.13], [1.02, -0.07]];
  distance = Math.min(distance, Math.max(polygonSignedDistance(x, y, tail), Math.abs(z) - 0.14));
  for (const side of [-1, 1]) {
    const wing = [[-0.78, side * 0.12], [-0.12, side * 0.14], [0.83, side * 1.27], [0.43, side * 0.24]];
    distance = Math.min(distance, Math.max(polygonSignedDistance(x, z, wing), Math.abs(y + 0.19) - 0.12));
    const pelvic = [[0.42, side * 0.20], [0.72, side * 0.23], [1.08, side * 0.62], [0.91, side * 0.20]];
    distance = Math.min(distance, Math.max(polygonSignedDistance(x, z, pelvic), Math.abs(y + 0.13) - 0.08));
  }
  const analFin = [[0.62, -0.24], [0.92, -0.21], [1.20, -0.55], [1.02, -0.18]];
  distance = Math.min(distance, Math.max(polygonSignedDistance(x, y, analFin), Math.abs(z) - 0.11));
  // A small smooth union allowance prevents a fin root or tail tip from
  // becoming a separate marching-cubes island at ordinary display detail.
  return distance - 0.055;
}

function heartPolygon() {
  const points = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3 / 18;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18;
    points.push([x, y]);
  }
  return points;
}

function heartDistance(x, y, z, polygon) {
  const planar = polygonSignedDistance(x, y, polygon);
  const depth = Math.abs(z) - (0.26 + 0.07 * Math.max(0, 1 - Math.abs(y)));
  return Math.hypot(Math.max(planar, 0), Math.max(depth, 0)) + Math.min(Math.max(planar, depth), 0);
}

function skullDistance(x, y, z) {
  let distance = ellipsoidDistance(x, y, z, 0, 0.20, 0, 0.82, 0.98, 0.67);
  distance = Math.min(distance, ellipsoidDistance(x, y, z, 0, -0.58, 0.01, 0.59, 0.40, 0.51));
  distance = Math.min(distance, ellipsoidDistance(x, y, z, 0, -0.81, 0.12, 0.43, 0.20, 0.38));
  for (const cx of [-0.34, 0.34]) {
    const socket = ellipsoidDistance(x, y, z, cx, 0.19, 0.53, 0.25, 0.28, 0.22);
    distance = Math.max(distance, -socket);
  }
  const nose = ellipsoidDistance(x, y, z, 0, -0.17, 0.59, 0.13, 0.31, 0.17);
  distance = Math.min(distance, nose);
  const nasalOpening = ellipsoidDistance(x, y, z, 0, -0.39, 0.68, 0.10, 0.11, 0.12);
  distance = Math.max(distance, -nasalOpening);
  const mouth = boxDistance(x, y, z, 0, -0.55, 0.49, 0.35, 0.045, 0.24);
  return Math.max(distance, -mouth);
}

function faceDistance(x, y, z) {
  let distance = ellipsoidDistance(x, y, z, 0, 0.02, 0, 0.84, 1.15, 0.66);
  for (const cx of [-0.34, 0.34]) {
    const socket = ellipsoidDistance(x, y, z, cx, 0.24, 0.52, 0.18, 0.14, 0.18);
    distance = Math.max(distance, -socket);
    const brow = ellipsoidDistance(x, y, z, cx, 0.44, 0.53, 0.22, 0.065, 0.12);
    distance = Math.min(distance, brow);
  }
  distance = Math.min(distance, ellipsoidDistance(x, y, z, 0, -0.02, 0.58, 0.12, 0.36, 0.20));
  distance = Math.min(distance, ellipsoidDistance(x, y, z, 0, -0.40, 0.54, 0.30, 0.085, 0.11));
  distance = Math.min(distance, ellipsoidDistance(x, y, z, 0, -0.52, 0.53, 0.27, 0.075, 0.10));
  return distance;
}

function buildingDistance(x, y, z) {
  const ground = boxDistance(x, y, z, 0, -0.86, 0, 1.05, 0.10, 0.72);
  const towerA = boxDistance(x, y, z, -0.48, 0.04, -0.08, 0.31, 0.84, 0.31);
  const towerB = boxDistance(x, y, z, 0.30, -0.23, 0.12, 0.27, 0.56, 0.27);
  const towerC = boxDistance(x, y, z, 0.72, -0.43, -0.30, 0.18, 0.36, 0.18);
  const spire = cylinderDistanceY(x, y, z, -0.48, 0.99, -0.08, 0.035, 0.23);
  return Math.min(ground, towerA, towerB, towerC, spire);
}

function bridgeDistance(x, y, z) {
  const deck = boxDistance(x, y, z, 0, -0.18, 0, 1.45, 0.10, 0.20);
  const rail = boxDistance(x, y, z, 0, 0.02, 0, 1.35, 0.035, 0.045);
  let distance = Math.min(deck, rail);
  for (const cx of [-1.05, -0.55, 0, 0.55, 1.05]) {
    distance = Math.min(distance, boxDistance(x, y, z, cx, -0.57, 0, 0.07, 0.40, 0.08));
  }
  for (const cx of [-0.88, -0.44, 0, 0.44, 0.88]) {
    distance = Math.min(distance, boxDistance(x, y, z, cx, -0.06, 0, 0.035, 0.15, 0.035));
  }
  return distance;
}

function mechanicalDistance(x, y, z) {
  let distance = cylinderDistanceY(x, y, z, 0, 0, 0, 0.82, 0.25);
  const centerHole = cylinderDistanceY(x, y, z, 0, 0, 0, 0.31, 0.42);
  distance = Math.max(distance, -centerHole);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = boxDistance(x, y, z, Math.cos(angle) * 0.91, 0, Math.sin(angle) * 0.91, 0.18, 0.16, 0.16);
    distance = Math.min(distance, tooth);
  }
  return distance;
}

function implicitFunctionFor(shape) {
  if (shape === 'shark') return sharkDistance;
  if (shape === 'heart') {
    const polygon = heartPolygon();
    return (x, y, z) => heartDistance(x, y, z, polygon);
  }
  if (shape === 'skull') return skullDistance;
  if (shape === 'building') return buildingDistance;
  if (shape === 'bridge') return bridgeDistance;
  if (shape === 'mechanical') return mechanicalDistance;
  if (shape === 'face') return faceDistance;
  return null;
}

function boundsForShape(shape) {
  const bounds = {
    shark: [[-1.78, -0.90, -1.38], [1.82, 1.10, 1.38]],
    heart: [[-1.05, -1.08, -0.58], [1.05, 1.00, 0.58]],
    skull: [[-0.92, -1.15, -0.82], [0.92, 1.28, 0.90]],
    building: [[-1.20, -1.20, -0.92], [1.15, 1.30, 0.92]],
    bridge: [[-1.62, -0.88, -0.36], [1.62, 0.34, 0.36]],
    mechanical: [[-1.20, -0.42, -1.20], [1.20, 0.42, 1.20]],
    face: [[-0.96, -1.28, -0.82], [0.96, 1.32, 0.91]]
  };
  return bounds[shape] || [[-1, -1, -1], [1, 1, 1]];
}

function pointKey(x, y, z, precision) {
  return `${Math.round(x * precision)},${Math.round(y * precision)},${Math.round(z * precision)}`;
}

export function createImplicitMeshGeometry(THREE, shape, detail = 36) {
  const distanceFn = implicitFunctionFor(shape);
  if (!distanceFn) throw new RangeError(`Gerador implícito não suportado: ${shape}`);
  const resolution = Math.min(52, clampMeshDetail(detail, 36));
  const [minimum, maximum] = boundsForShape(shape);
  const extents = maximum.map((value, axis) => value - minimum[axis]);
  let nx = resolution;
  let ny = Math.max(12, Math.round(resolution * extents[1] / extents[0]));
  let nz = Math.max(12, Math.round(resolution * extents[2] / extents[0]));
  const cellCount = () => nx * ny * nz;
  while (cellCount() > MAX_GRID_CELLS) {
    nx = Math.max(12, Math.floor(nx * 0.94));
    ny = Math.max(12, Math.floor(ny * 0.94));
    nz = Math.max(12, Math.floor(nz * 0.94));
  }
  const dx = extents[0] / nx;
  const dy = extents[1] / ny;
  const dz = extents[2] / nz;
  const gridWidth = nx + 1;
  const gridHeight = ny + 1;
  const gridDepth = nz + 1;
  const values = new Float32Array(gridWidth * gridHeight * gridDepth);
  const gridIndex = (x, y, z) => (z * gridHeight + y) * gridWidth + x;
  for (let z = 0; z <= nz; z++) {
    const pz = minimum[2] + z * dz;
    for (let y = 0; y <= ny; y++) {
      const py = minimum[1] + y * dy;
      for (let x = 0; x <= nx; x++) {
        values[gridIndex(x, y, z)] = distanceFn(minimum[0] + x * dx, py, pz);
      }
    }
  }

  const positions = [];
  const indices = [];
  const vertexMap = new Map();
  const precision = Math.max(10_000, Math.round(1 / Math.min(dx, dy, dz) * 100_000));
  const cornerOffsets = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const tetrahedra = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];

  const addVertex = point => {
    const key = pointKey(point[0], point[1], point[2], precision);
    const existing = vertexMap.get(key);
    if (existing !== undefined) return existing;
    const index = positions.length / 3;
    positions.push(point[0], point[1], point[2]);
    vertexMap.set(key, index);
    return index;
  };
  const edgePoint = (a, b) => {
    const denominator = a.value - b.value;
    const t = Math.abs(denominator) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, a.value / denominator));
    return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t];
  };
  const addOrientedTriangle = (points, outward) => {
    const [a, b, c] = points;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(...normal) < 1e-10) return;
    const order = normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2] < 0
      ? [0, 2, 1] : [0, 1, 2];
    const ia = addVertex(points[order[0]]);
    const ib = addVertex(points[order[1]]);
    const ic = addVertex(points[order[2]]);
    if (ia !== ib && ib !== ic && ia !== ic) addIndexedTriangle(indices, ia, ib, ic);
  };

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const corners = cornerOffsets.map(([ox, oy, oz]) => {
          const gx = x + ox;
          const gy = y + oy;
          const gz = z + oz;
          return {
            x: minimum[0] + gx * dx,
            y: minimum[1] + gy * dy,
            z: minimum[2] + gz * dz,
            value: values[gridIndex(gx, gy, gz)]
          };
        });
        if (corners.every(point => point.value < 0) || corners.every(point => point.value >= 0)) continue;
        for (const tetra of tetrahedra) {
          const inside = tetra.map(i => corners[i]).filter(point => point.value < 0);
          const outside = tetra.map(i => corners[i]).filter(point => point.value >= 0);
          if (!inside.length || !outside.length) continue;
          const outward = [0, 1, 2].map(axis => outside.reduce((sum, point) => sum + point[['x', 'y', 'z'][axis]], 0) / outside.length
            - inside.reduce((sum, point) => sum + point[['x', 'y', 'z'][axis]], 0) / inside.length);
          if (inside.length === 1) {
            addOrientedTriangle(outside.map(point => edgePoint(inside[0], point)), outward);
          } else if (inside.length === 3) {
            addOrientedTriangle(inside.map(point => edgePoint(outside[0], point)), outward);
          } else {
            const p00 = edgePoint(inside[0], outside[0]);
            const p01 = edgePoint(inside[0], outside[1]);
            const p10 = edgePoint(inside[1], outside[0]);
            const p11 = edgePoint(inside[1], outside[1]);
            addOrientedTriangle([p00, p01, p11], outward);
            addOrientedTriangle([p00, p11, p10], outward);
          }
        }
        if (indices.length / 3 > MAX_TRIANGLES) throw new RangeError('A densidade excede o limite seguro de triângulos.');
      }
    }
  }
  if (positions.length < 9 || indices.length < 3) throw new Error(`O gerador ${shape} não produziu uma superfície triangulada.`);
  return finalizeGeometry(THREE, positions, indices);
}

function finalizeGeometry(THREE, positions, indices) {
  if (positions.some(value => !Number.isFinite(value))) throw new Error('A malha contém coordenadas não finitas.');
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= positions.length / 3) throw new Error('A malha contém índice inválido.');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildConnectedImplicitGeometry(THREE, shape, detail, distanceFn = null, customBounds = null) {
  let resolution = clampMeshDetail(detail, 36);
  const maximum = Math.min(52, Math.max(32, resolution));
  while (true) {
    const geometry = distanceFn
      ? createImplicitMeshGeometryFromFunction(THREE, distanceFn, customBounds, resolution)
      : createImplicitMeshGeometry(THREE, shape, resolution);
    if (inspectIndexedGeometry(geometry).connectedComponents === 1) return geometry;
    geometry.dispose();
    if (resolution >= maximum) {
      if (resolution >= 52) throw new Error(`Não foi possível conectar a malha gerada para ${shape}.`);
      resolution = maximum;
    } else {
      resolution = Math.min(maximum, Math.max(resolution + 4, Math.ceil(resolution * 1.2)));
    }
  }
}

export function buildMeshGeometry(THREE, shape, options = {}) {
  const detail = clampMeshDetail(options.detail, 36);
  if (shape === 'sphere' || shape === 'cloud' || shape === 'planet') {
    return createUvSphereGeometry(THREE, detail, shape === 'cloud' ? [1.05, 0.86, 1] : [1, 1, 1]);
  }
  if (shape === 'torus') return createTorusGeometry(THREE, detail);
  if (shape === 'wave' || shape === 'terrain') return createHeightFieldGeometry(THREE, detail, shape);
  if (shape === 'spiral') return createSpiralTubeGeometry(THREE, detail);
  if (shape === 'shark' || shape === 'heart' || shape === 'skull' || shape === 'building' || shape === 'bridge' || shape === 'mechanical' || shape === 'face') {
    return buildConnectedImplicitGeometry(THREE, shape, detail);
  }
  if (shape === 'custom') {
    const parts = Array.isArray(options.parts) ? options.parts.slice(0, 24) : [];
    if (!parts.length) return createUvSphereGeometry(THREE, detail);
    const bounds = [[-2.5, -2.5, -2.5], [2.5, 2.5, 2.5]];
    const partDistance = (x, y, z) => {
      let distance = Infinity;
      for (const part of parts) {
        const rx = Number.isFinite(part.rx) ? part.rx : 0;
        const ry = Number.isFinite(part.ry) ? part.ry : 0;
        const rz = Number.isFinite(part.rz) ? part.rz : 0;
        const cosX = Math.cos(-rx), sinX = Math.sin(-rx);
        const y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
        const cosY = Math.cos(-ry), sinY = Math.sin(-ry);
        const x2 = x * cosY + z1 * sinY, z2 = -x * sinY + z1 * cosY;
        const cosZ = Math.cos(-rz), sinZ = Math.sin(-rz);
        const x3 = x2 * cosZ - y1 * sinZ, y3 = x2 * sinZ + y1 * cosZ;
        const px = x3 - (part.x || 0), py = y3 - (part.y || 0), pz = z2 - (part.z || 0);
        const sx = Math.max(0.05, part.sx || 0.5), sy = Math.max(0.05, part.sy || 0.5), sz = Math.max(0.05, part.sz || 0.5);
        let local;
        if (part.kind === 'sphere' || part.kind === 'ellipsoid') local = ellipsoidDistance(px, py, pz, 0, 0, 0, sx, sy, sz);
        else if (part.kind === 'cylinder') local = cylinderDistanceY(px, py, pz, 0, 0, 0, Math.min(sx, sz), sy);
        else if (part.kind === 'cone') local = Math.max(Math.hypot(px, pz) - Math.max(0.02, sx * (0.5 - py / (2 * sy))), Math.abs(py) - sy);
        else if (part.kind === 'torus') local = Math.hypot(Math.hypot(px, pz) - sx, py) - Math.min(sy, sz);
        else local = boxDistance(px, py, pz, 0, 0, 0, sx, sy, sz);
        distance = Math.min(distance, local);
      }
      return distance;
    };
    const resolution = Math.min(46, detail);
    return buildConnectedImplicitGeometry(THREE, 'custom', resolution, partDistance, bounds);
  }
  throw new RangeError(`Forma não suportada pelo gerador de malhas: ${shape}`);
}

function createImplicitMeshGeometryFromFunction(THREE, distanceFn, bounds, detail) {
  // Reutiliza o mesmo extrator limitado, aplicando uma chave interna conhecida para o campo SDF.
  return marchingTetrahedra(THREE, distanceFn, bounds, detail);
}

function marchingTetrahedra(THREE, distanceFn, bounds, detail) {
  // Adaptador compacto para composições customizadas, mantendo buffers finitos e indexados.
  const resolution = Math.min(48, clampMeshDetail(detail, 32));
  const [minimum, maximum] = bounds;
  const extents = maximum.map((value, axis) => value - minimum[axis]);
  let nx = resolution, ny = resolution, nz = resolution;
  while (nx * ny * nz > MAX_GRID_CELLS) { nx--; ny--; nz--; }
  const dx = extents[0] / nx, dy = extents[1] / ny, dz = extents[2] / nz;
  const gridWidth = nx + 1, gridHeight = ny + 1;
  const values = new Float32Array(gridWidth * gridHeight * (nz + 1));
  const gridIndex = (x, y, z) => (z * gridHeight + y) * gridWidth + x;
  for (let z = 0; z <= nz; z++) for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    values[gridIndex(x, y, z)] = distanceFn(minimum[0] + x * dx, minimum[1] + y * dy, minimum[2] + z * dz);
  }
  const positions = [], indices = [], vertexMap = new Map();
  const precision = Math.max(10_000, Math.round(1 / Math.min(dx, dy, dz) * 100_000));
  const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetrahedra = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const addVertex = p => {
    const key = pointKey(p[0], p[1], p[2], precision);
    const known = vertexMap.get(key);
    if (known !== undefined) return known;
    const index = positions.length / 3;
    positions.push(...p); vertexMap.set(key, index); return index;
  };
  const crossing = (a, b) => {
    const d = a.v - b.v;
    const t = Math.abs(d) < 1e-10 ? 0.5 : Math.max(0, Math.min(1, a.v / d));
    return [a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t, a.z + (b.z-a.z)*t];
  };
  const triangle = (p, direction) => {
    const ab=[p[1][0]-p[0][0],p[1][1]-p[0][1],p[1][2]-p[0][2]], ac=[p[2][0]-p[0][0],p[2][1]-p[0][1],p[2][2]-p[0][2]];
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if (Math.hypot(...n)<1e-10) return;
    const order=n[0]*direction[0]+n[1]*direction[1]+n[2]*direction[2]<0?[0,2,1]:[0,1,2];
    const a=addVertex(p[order[0]]),b=addVertex(p[order[1]]),c=addVertex(p[order[2]]);
    if(a!==b&&b!==c&&a!==c) indices.push(a,b,c);
  };
  for(let z=0;z<nz;z++) for(let y=0;y<ny;y++) for(let x=0;x<nx;x++) {
    const cell=corners.map(([ox,oy,oz])=>{const gx=x+ox,gy=y+oy,gz=z+oz;return{x:minimum[0]+gx*dx,y:minimum[1]+gy*dy,z:minimum[2]+gz*dz,v:values[gridIndex(gx,gy,gz)]};});
    if(cell.every(p=>p.v<0)||cell.every(p=>p.v>=0)) continue;
    for(const tetra of tetrahedra){
      const inside=tetra.map(i=>cell[i]).filter(p=>p.v<0),outside=tetra.map(i=>cell[i]).filter(p=>p.v>=0);
      if(!inside.length||!outside.length)continue;
      const direction=[0,1,2].map(axis=>outside.reduce((s,p)=>s+p[['x','y','z'][axis]],0)/outside.length-inside.reduce((s,p)=>s+p[['x','y','z'][axis]],0)/inside.length);
      if(inside.length===1)triangle(outside.map(p=>crossing(inside[0],p)),direction);
      else if(inside.length===3)triangle(inside.map(p=>crossing(outside[0],p)),direction);
      else {const p00=crossing(inside[0],outside[0]),p01=crossing(inside[0],outside[1]),p10=crossing(inside[1],outside[0]),p11=crossing(inside[1],outside[1]);triangle([p00,p01,p11],direction);triangle([p00,p11,p10],direction);}
    }
    if(indices.length/3>MAX_TRIANGLES)throw new RangeError('A composição custom excede o limite seguro de triângulos.');
  }
  if(positions.length<9||indices.length<3)throw new Error('A composição custom não gerou uma superfície válida.');
  return finalizeGeometry(THREE,positions,indices);
}

export function inspectIndexedGeometry(geometry) {
  const position = geometry?.getAttribute?.('position');
  const index = geometry?.getIndex?.();
  if (!position || !index || index.count % 3 !== 0) throw new TypeError('Esperada uma malha indexada de triângulos.');
  const parent = new Int32Array(position.count);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const root = value => { let current = value; while (parent[current] !== current) { parent[current] = parent[parent[current]]; current = parent[current]; } return current; };
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    if (a >= position.count || b >= position.count || c >= position.count || a < 0 || b < 0 || c < 0) throw new RangeError('Índice de triângulo fora do buffer de vértices.');
    const ra = root(a), rb = root(b), rc = root(c); parent[rb] = ra; parent[rc] = ra;
  }
  const components = new Set();
  for (let i = 0; i < parent.length; i++) components.add(root(i));
  for (let i = 0; i < position.count; i++) {
    if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) throw new TypeError('A malha contém vértice não finito.');
  }
  return {
    vertices: position.count,
    triangles: index.count / 3,
    connectedComponents: components.size,
    indexed: true,
    bounds: geometry.boundingBox ? {
      min: geometry.boundingBox.min.toArray(),
      max: geometry.boundingBox.max.toArray()
    } : null
  };
}
