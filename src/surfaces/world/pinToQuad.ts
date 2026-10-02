// Pins a flat DOM element onto a rectangle in the 3D scene: projects the rectangle's
// corners to the screen and sets a CSS matrix3d (a perspective warp) on the element.
// Keeps real HTML (crisp text, clicks, React context) on a 3D surface.

import * as THREE from "three";

type Point = [number, number];

/** CSS matrix3d mapping the rectangle (0,0)-(w,h) onto the quad [topLeft, topRight, bottomLeft, bottomRight]. */
export function quadTransform(w: number, h: number, quad: [Point, Point, Point, Point]): string {
  const src: Point[] = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  // Solve the 8 unknowns of the homography with Gaussian elimination.
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = quad[i];
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u]);
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c < 9; c++) a[r][c] -= f * a[col][c];
    }
  }
  const h8 = a.map((row, i) => row[8] / row[i]);
  const [h0, h1, h2, h3, h4, h5, h6, h7] = h8;
  return `matrix3d(${[h0, h3, 0, h6, h1, h4, 0, h7, 0, 0, 1, 0, h2, h5, 0, 1].join(",")})`;
}

const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

/**
 * Place `el` (designWidth × designHeight CSS px) over the plane `anchor` of size
 * width × height (metres, centred on the anchor, facing +z).
 */
export function pinElement(
  el: HTMLElement,
  anchor: THREE.Object3D,
  camera: THREE.Camera,
  viewport: { width: number; height: number },
  size: { width: number; height: number; designWidth: number; designHeight: number },
): void {
  const hw = size.width / 2;
  const hh = size.height / 2;
  corners[0].set(-hw, hh, 0);
  corners[1].set(hw, hh, 0);
  corners[2].set(-hw, -hh, 0);
  corners[3].set(hw, -hh, 0);
  const quad: Point[] = [];
  for (const c of corners) {
    anchor.localToWorld(c);
    c.project(camera);
    if (c.z > 1 || c.z < -1) {
      el.style.visibility = "hidden";
      return;
    }
    quad.push([((c.x + 1) / 2) * viewport.width, ((1 - c.y) / 2) * viewport.height]);
  }
  el.style.visibility = "visible";
  el.style.transform = quadTransform(size.designWidth, size.designHeight, quad as [Point, Point, Point, Point]);
}
