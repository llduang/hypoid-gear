import * as THREE from 'three'

// ============================================================
// Hypoid Gear Geometry Computation
// ============================================================

export interface HypoidGeometry {
  axisPOrigin: THREE.Vector3
  axisPDir: THREE.Vector3
  axisGOrigin: THREE.Vector3
  axisGDir: THREE.Vector3
  axisPStart: THREE.Vector3
  axisPEnd: THREE.Vector3
  axisGStart: THREE.Vector3
  axisGEnd: THREE.Vector3
  K1: THREE.Vector3
  K2: THREE.Vector3
  P: THREE.Vector3
  H1: THREE.Vector3
  H2: THREE.Vector3
  O1: THREE.Vector3
  O2: THREE.Vector3
  planeTCorners: THREE.Vector3[]
  gamma: number
  Gamma: number
  Sigma: number
  Ep: number
  eta: number
  epsilon: number
  epsilonPrime: number
  smallConeVertex: THREE.Vector3
  largeConeVertex: THREE.Vector3
  smallConeRadius: number
  largeConeRadius: number
  smallConeBaseCenter: THREE.Vector3
  largeConeBaseCenter: THREE.Vector3
  smallConeHeight: number
  largeConeHeight: number
  Rp: number
  R: number
  Ap: number
  A: number
  Zp: number
  Z: number
  Zg: number
  G: number
}

export function computeHypoidGeometry(
  sigma: number,
  ep: number,
  pRatio: number
): HypoidGeometry {
  const Sigma = sigma * Math.PI / 180

  // Axis g: along z-axis through origin
  const axisGOrigin = new THREE.Vector3(0, 0, 0)
  const axisGDir = new THREE.Vector3(0, 0, 1).normalize()

  // Axis p: tilted by Sigma from z-axis in xz-plane, offset by Ep in y-direction
  const axisPDir = new THREE.Vector3(Math.sin(Sigma), 0, Math.cos(Sigma)).normalize()
  const axisPOrigin = new THREE.Vector3(0, ep, 0)

  const P0 = axisPOrigin.clone()
  const D0 = axisPDir.clone()
  const P1 = axisGOrigin.clone()
  const D1 = axisGDir.clone()

  // Find common perpendicular (O1 on axis p, O2 on axis g)
  const w0 = P0.clone().sub(P1)
  const a = D0.dot(D0)
  const b = D0.dot(D1)
  const c = D1.dot(D1)
  const d = D0.dot(w0)
  const e = D1.dot(w0)
  const denom = a * c - b * b

  let t_cp: number, s_cp: number
  if (Math.abs(denom) < 1e-10) {
    t_cp = -d / a
    s_cp = 0
  } else {
    t_cp = (b * e - c * d) / denom
    s_cp = (a * e - b * d) / denom
  }

  const O1 = P0.clone().add(D0.clone().multiplyScalar(t_cp))
  const O2 = P1.clone().add(D1.clone().multiplyScalar(s_cp))

  // Choose K1 on axis p and K2 on axis g
  const k1Dist = ep * 2.0
  const k2Dist = ep * 2.5

  const K1 = O1.clone().add(D0.clone().multiplyScalar(k1Dist))
  const K2 = O2.clone().add(D1.clone().multiplyScalar(k2Dist))

  // P is at fraction pRatio along K1K2 from K1 to K2
  const P_final = K1.clone().lerp(K2, pRatio)

  // K1K2 direction
  const K1K2_vec = K2.clone().sub(K1)
  const K1K2_len = K1K2_vec.length()
  const K1K2_unit = K1K2_vec.clone().normalize()

  // Plane T at P_final, perpendicular to K1K2
  const planeTNormal = K1K2_unit.clone()

  // H1: intersection of plane T with axis p
  const denomH1 = planeTNormal.dot(D0)
  let H1: THREE.Vector3
  if (Math.abs(denomH1) > 1e-10) {
    const t_H1 = planeTNormal.dot(P_final.clone().sub(P0)) / denomH1
    H1 = P0.clone().add(D0.clone().multiplyScalar(t_H1))
  } else {
    H1 = O1.clone()
  }

  // H2: intersection of plane T with axis g
  const denomH2 = planeTNormal.dot(D1)
  let H2: THREE.Vector3
  if (Math.abs(denomH2) > 1e-10) {
    const t_H2 = planeTNormal.dot(P_final.clone().sub(P1)) / denomH2
    H2 = P1.clone().add(D1.clone().multiplyScalar(t_H2))
  } else {
    H2 = O2.clone()
  }

  // Compute cone angles
  const H1P = P_final.clone().sub(H1)
  const H1P_len = H1P.length()
  const D0_hat = D0.clone().normalize()
  const H1P_along_axis = H1P.dot(D0_hat)
  const cosGamma = Math.min(1, Math.abs(H1P_along_axis) / Math.max(H1P_len, 1e-10))
  const gamma = Math.acos(cosGamma)

  const H2P = P_final.clone().sub(H2)
  const H2P_len = H2P.length()
  const D1_hat = D1.clone().normalize()
  const H2P_along_axis = H2P.dot(D1_hat)
  const cosGammaLarge = Math.min(1, Math.abs(H2P_along_axis) / Math.max(H2P_len, 1e-10))
  const Gamma = Math.acos(cosGammaLarge)

  // Cone vertices: H1 and H2 ARE the pitch cone vertices (apexes)
  // In hypoid gear geometry, H1 (intersection of plane T with pinion axis)
  // is the vertex of the pinion pitch cone, and H2 is the vertex of the gear pitch cone
  const smallVertex = H1.clone()
  const largeVertex = H2.clone()

  // Cone base centers: foot of perpendicular from P to each axis
  // The base circle passes through P, centered on the axis at the foot
  const smallConeBaseCenter = H1.clone().add(D0_hat.clone().multiplyScalar(H1P_along_axis))
  const largeConeBaseCenter = H2.clone().add(D1_hat.clone().multiplyScalar(H2P_along_axis))

  // Cone dimensions
  const smallConeRadius = H1P_len * Math.sin(gamma)
  const largeConeRadius = H2P_len * Math.sin(Gamma)
  const smallConeHeight = Math.abs(H1P_along_axis)
  const largeConeHeight = Math.abs(H2P_along_axis)

  // Derived parameters
  const Rp = H1P_len * Math.sin(gamma)
  const R = H2P_len * Math.sin(Gamma)
  const Ap = Math.abs(H1P_along_axis)
  const A = Math.abs(H2P_along_axis)

  // Compute ε (large wheel offset angle)
  const cosEpsilon = (Math.sin(gamma) + Math.sin(Gamma) * Math.cos(Sigma)) /
    (Math.cos(Gamma) * Math.sin(Sigma) + 1e-10)
  const epsilon = Math.acos(Math.min(1, Math.max(-1, cosEpsilon)))

  // Compute η (small wheel offset angle)
  const cosEta = (Math.sin(Gamma) + Math.sin(gamma) * Math.cos(Sigma)) /
    (Math.cos(gamma) * Math.sin(Sigma) + 1e-10)
  const eta = Math.acos(Math.min(1, Math.max(-1, cosEta)))

  // ε' (offset angle between pitch cones)
  const sinEpsilonPrime = Math.sin(Sigma) * Math.sin(epsilon) / (Math.cos(gamma) + 1e-10)
  const epsilonPrime = Math.asin(Math.min(1, Math.max(-1, sinEpsilonPrime)))

  // Zp and Z
  const Zp = ep / (Math.tan(epsilon + 1e-10)) / (Math.tan(Sigma + 1e-10)) + Ap * Math.tan(gamma) * Math.sin(Gamma)
  const Z = R / (Math.tan(Gamma + 1e-10)) - Zp

  // Zg and G
  const Zg = ep / ((Math.tan(epsilon + 1e-10)) * Math.sin(Sigma + 1e-10)) - Rp * Math.tan(gamma)
  const G = Rp / (Math.tan(gamma + 1e-10)) - Zg

  // Plane T visualization corners
  const planeSize = Math.max(ep * 2.5, 7)
  const planeU = new THREE.Vector3().crossVectors(planeTNormal, new THREE.Vector3(0, 1, 0))
  if (planeU.length() < 0.01) {
    planeU.crossVectors(planeTNormal, new THREE.Vector3(1, 0, 0))
  }
  planeU.normalize()
  const planeV = new THREE.Vector3().crossVectors(planeTNormal, planeU).normalize()

  const planeTCorners = [
    P_final.clone().add(planeU.clone().multiplyScalar(planeSize)).add(planeV.clone().multiplyScalar(planeSize)),
    P_final.clone().sub(planeU.clone().multiplyScalar(planeSize)).add(planeV.clone().multiplyScalar(planeSize)),
    P_final.clone().sub(planeU.clone().multiplyScalar(planeSize)).sub(planeV.clone().multiplyScalar(planeSize)),
    P_final.clone().add(planeU.clone().multiplyScalar(planeSize)).sub(planeV.clone().multiplyScalar(planeSize)),
  ]

  // Extended axis lines
  const axisExtent = 14
  const axisPStart = axisPOrigin.clone().sub(D0.clone().multiplyScalar(axisExtent))
  const axisPEnd = axisPOrigin.clone().add(D0.clone().multiplyScalar(axisExtent))
  const axisGStart = axisGOrigin.clone().sub(D1.clone().multiplyScalar(axisExtent))
  const axisGEnd = axisGOrigin.clone().add(D1.clone().multiplyScalar(axisExtent))

  return {
    axisPOrigin, axisPDir, axisGOrigin, axisGDir,
    axisPStart, axisPEnd, axisGStart, axisGEnd,
    K1, K2, P: P_final,
    H1, H2, O1, O2,
    planeTCorners,
    gamma, Gamma, Sigma, Ep: ep,
    eta, epsilon, epsilonPrime,
    smallConeVertex: smallVertex,
    largeConeVertex: largeVertex,
    smallConeRadius, largeConeRadius,
    smallConeBaseCenter, largeConeBaseCenter,
    smallConeHeight, largeConeHeight,
    Rp, R, Ap, A,
    Zp, Z, Zg, G,
  }
}

// Compute just the angles (lightweight, for graph sampling)
export function computeHypoidAngles(sigma: number, ep: number, pRatio: number): {
  gamma: number
  Gamma: number
  eta: number
  epsilon: number
} {
  const Sigma = sigma * Math.PI / 180
  const axisPDir = new THREE.Vector3(Math.sin(Sigma), 0, Math.cos(Sigma)).normalize()
  const axisGDir = new THREE.Vector3(0, 0, 1).normalize()
  const axisPOrigin = new THREE.Vector3(0, ep, 0)
  const axisGOrigin = new THREE.Vector3(0, 0, 0)

  // Common perpendicular
  const w0 = axisPOrigin.clone().sub(axisGOrigin)
  const a = axisPDir.dot(axisPDir)
  const b = axisPDir.dot(axisGDir)
  const c = axisGDir.dot(axisGDir)
  const d = axisPDir.dot(w0)
  const e = axisGDir.dot(w0)
  const denom = a * c - b * b

  let t_cp: number, s_cp: number
  if (Math.abs(denom) < 1e-10) {
    t_cp = -d / a
    s_cp = 0
  } else {
    t_cp = (b * e - c * d) / denom
    s_cp = (a * e - b * d) / denom
  }

  const O1 = axisPOrigin.clone().add(axisPDir.clone().multiplyScalar(t_cp))
  const O2 = axisGOrigin.clone().add(axisGDir.clone().multiplyScalar(s_cp))

  const K1 = O1.clone().add(axisPDir.clone().multiplyScalar(ep * 2.0))
  const K2 = O2.clone().add(axisGDir.clone().multiplyScalar(ep * 2.5))
  const P_final = K1.clone().lerp(K2, pRatio)

  const K1K2_unit = K2.clone().sub(K1).normalize()

  // H1
  const denomH1 = K1K2_unit.dot(axisPDir)
  let H1: THREE.Vector3
  if (Math.abs(denomH1) > 1e-10) {
    const t_H1 = K1K2_unit.dot(P_final.clone().sub(axisPOrigin)) / denomH1
    H1 = axisPOrigin.clone().add(axisPDir.clone().multiplyScalar(t_H1))
  } else {
    H1 = O1.clone()
  }

  // H2
  const denomH2 = K1K2_unit.dot(axisGDir)
  let H2: THREE.Vector3
  if (Math.abs(denomH2) > 1e-10) {
    const t_H2 = K1K2_unit.dot(P_final.clone().sub(axisGOrigin)) / denomH2
    H2 = axisGOrigin.clone().add(axisGDir.clone().multiplyScalar(t_H2))
  } else {
    H2 = O2.clone()
  }

  const H1P = P_final.clone().sub(H1)
  const H1P_len = H1P.length()
  const H1P_along_axis = H1P.dot(axisPDir.clone().normalize())
  const cosGamma = Math.min(1, Math.abs(H1P_along_axis) / Math.max(H1P_len, 1e-10))
  const gamma = Math.acos(cosGamma)

  const H2P = P_final.clone().sub(H2)
  const H2P_len = H2P.length()
  const H2P_along_axis = H2P.dot(axisGDir.clone().normalize())
  const cosGammaLarge = Math.min(1, Math.abs(H2P_along_axis) / Math.max(H2P_len, 1e-10))
  const Gamma = Math.acos(cosGammaLarge)

  // Derived angles
  const cosEpsilon = (Math.sin(gamma) + Math.sin(Gamma) * Math.cos(Sigma)) /
    (Math.cos(Gamma) * Math.sin(Sigma) + 1e-10)
  const epsilon = Math.acos(Math.min(1, Math.max(-1, cosEpsilon)))

  const cosEta = (Math.sin(Gamma) + Math.sin(gamma) * Math.cos(Sigma)) /
    (Math.cos(gamma) * Math.sin(Sigma) + 1e-10)
  const eta = Math.acos(Math.min(1, Math.max(-1, cosEta)))

  return { gamma, Gamma, eta, epsilon }
}
