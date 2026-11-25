import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Preset3DModelKey } from './preset3dModels';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Edge3D {
  a: number;
  b: number;
  color?: string;
  width?: number;
  glow?: boolean;
}

interface Face3D {
  indices: number[];
  fill: string;
  stroke?: string;
}

interface Mesh3D {
  vertices: Point3D[];
  edges: Edge3D[];
  faces?: Face3D[];
}

function addBox(
  vertices: Point3D[],
  edges: Edge3D[],
  faces: Face3D[],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  edgeColor: string,
  faceFill: string,
  glow = false,
) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  const base = vertices.length;
  vertices.push(
    { x: cx - hw, y: cy - hh, z: cz - hd },
    { x: cx + hw, y: cy - hh, z: cz - hd },
    { x: cx + hw, y: cy + hh, z: cz - hd },
    { x: cx - hw, y: cy + hh, z: cz - hd },
    { x: cx - hw, y: cy - hh, z: cz + hd },
    { x: cx + hw, y: cy - hh, z: cz + hd },
    { x: cx + hw, y: cy + hh, z: cz + hd },
    { x: cx - hw, y: cy + hh, z: cz + hd },
  );

  const pairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  for (const [a, b] of pairs) {
    edges.push({ a: base + a, b: base + b, color: edgeColor, width: glow ? 1.8 : 1.2, glow });
  }

  faces.push(
    { indices: [base + 0, base + 1, base + 2, base + 3], fill: faceFill },
    { indices: [base + 4, base + 5, base + 6, base + 7], fill: faceFill },
    { indices: [base + 0, base + 1, base + 5, base + 4], fill: faceFill },
    { indices: [base + 2, base + 3, base + 7, base + 6], fill: faceFill },
    { indices: [base + 0, base + 3, base + 7, base + 4], fill: faceFill },
    { indices: [base + 1, base + 2, base + 6, base + 5], fill: faceFill },
  );
}

function addRingLoop(
  vertices: Point3D[],
  edges: Edge3D[],
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  segments: number,
  plane: 'xy' | 'xz' | 'yz',
  color: string,
  width = 1.6,
  glow = false,
): number[] {
  const base = vertices.length;
  const idxList: number[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const c = Math.cos(theta) * radius;
    const s = Math.sin(theta) * radius;
    if (plane === 'xy') vertices.push({ x: cx + c, y: cy + s, z: cz });
    else if (plane === 'xz') vertices.push({ x: cx + c, y: cy, z: cz + s });
    else vertices.push({ x: cx, y: cy + c, z: cz + s });
    idxList.push(base + i);
  }
  for (let i = 0; i < segments; i++) {
    edges.push({
      a: base + i,
      b: base + ((i + 1) % segments),
      color,
      width,
      glow,
    });
  }
  return idxList;
}

function buildPresetMesh(presetKey: Preset3DModelKey, accent: string, secondary: string): Mesh3D {
  const vertices: Point3D[] = [];
  const edges: Edge3D[] = [];
  const faces: Face3D[] = [];

  switch (presetKey) {
    case 'preset_watch': {
      // Thân vỏ đồng hồ tròn nhiều lớp + mặt kính + càng nối + dây da 3D
      const frontRing = addRingLoop(vertices, edges, 0, 0, 18, 62, 24, 'xy', accent, 2.2, true);
      const backRing = addRingLoop(vertices, edges, 0, 0, -18, 62, 24, 'xy', accent, 1.4, false);
      addRingLoop(vertices, edges, 0, 0, 22, 50, 24, 'xy', secondary, 1.5, true);
      addRingLoop(vertices, edges, 0, 0, 23, 24, 16, 'xy', accent, 1.2, true);
      faces.push({ indices: frontRing, fill: 'rgba(15, 23, 42, 0.72)' });
      faces.push({ indices: backRing, fill: 'rgba(15, 23, 42, 0.5)' });
      for (let i = 0; i < 24; i += 2) {
        edges.push({ a: frontRing[i], b: backRing[i], color: accent, width: 1 });
      }
      // Núm chỉnh giờ
      addBox(vertices, edges, faces, 68, 0, 0, 14, 18, 16, accent, 'rgba(245, 158, 11, 0.3)', true);
      // Dây đeo trên & dưới
      addBox(vertices, edges, faces, 0, -88, 0, 44, 52, 12, '#d97706', 'rgba(120, 53, 15, 0.45)');
      addBox(vertices, edges, faces, 0, 88, 0, 44, 52, 12, '#d97706', 'rgba(120, 53, 15, 0.45)');
      // Kim đồng hồ
      const cIdx = vertices.length;
      vertices.push({ x: 0, y: 0, z: 25 }, { x: 0, y: -38, z: 25 }, { x: 28, y: 14, z: 25 });
      edges.push(
        { a: cIdx, b: cIdx + 1, color: '#ffffff', width: 2.2, glow: true },
        { a: cIdx, b: cIdx + 2, color: secondary, width: 2, glow: true },
      );
      break;
    }

    case 'preset_painting': {
      // Khung tranh bảo tàng chạm khắc 3D nhiều lớp + giá đỡ vàng kim
      addBox(
        vertices,
        edges,
        faces,
        0,
        0,
        0,
        150,
        112,
        14,
        accent,
        'rgba(180, 130, 35, 0.28)',
        true,
      );
      addBox(
        vertices,
        edges,
        faces,
        0,
        0,
        8,
        124,
        86,
        6,
        secondary,
        'rgba(30, 41, 59, 0.75)',
        true,
      );
      addBox(vertices, edges, faces, 0, 0, 12, 108, 72, 2, '#fde68a', 'rgba(251, 191, 36, 0.14)');
      // Đế giá tranh bảo tàng
      addBox(vertices, edges, faces, -48, 70, -10, 10, 36, 12, accent, 'rgba(245, 158, 11, 0.25)');
      addBox(vertices, edges, faces, 48, 70, -10, 10, 36, 12, accent, 'rgba(245, 158, 11, 0.25)');
      break;
    }

    case 'preset_car': {
      // Khung thân siêu xe khí động học + khoang lái + 4 bánh xoay
      addBox(
        vertices,
        edges,
        faces,
        0,
        12,
        0,
        170,
        26,
        72,
        accent,
        'rgba(239, 68, 68, 0.22)',
        true,
      );
      addBox(
        vertices,
        edges,
        faces,
        -8,
        -12,
        0,
        88,
        24,
        58,
        secondary,
        'rgba(56, 189, 248, 0.22)',
        true,
      );
      // Cánh gió sau
      addBox(
        vertices,
        edges,
        faces,
        -76,
        -16,
        0,
        18,
        10,
        68,
        accent,
        'rgba(245, 158, 11, 0.3)',
        true,
      );
      // 4 bánh xe 3D
      const wheels = [
        [-52, 26, 38],
        [52, 26, 38],
        [-52, 26, -38],
        [52, 26, -38],
      ];
      for (const [wx, wy, wz] of wheels) {
        addRingLoop(vertices, edges, wx, wy, wz, 20, 14, 'xy', '#f8fafc', 2, true);
        addRingLoop(vertices, edges, wx, wy, wz, 10, 10, 'xy', accent, 1.4);
      }
      break;
    }

    case 'preset_diamond': {
      // Viên kim cương giác cắt Brilliant 3D đa diện lấp lánh (Table -> Crown -> Girdle -> Pavilion -> Culet)
      const table = addRingLoop(vertices, edges, 0, -56, 0, 38, 8, 'xz', '#ffffff', 2.2, true);
      const girdle = addRingLoop(vertices, edges, 0, -18, 0, 70, 8, 'xz', accent, 2.4, true);
      addRingLoop(vertices, edges, 0, -12, 0, 70, 8, 'xz', secondary, 1.4, true);
      const innerCore = addRingLoop(vertices, edges, 0, -24, 0, 32, 8, 'xz', '#bae6fd', 1.1, false);
      const culetIdx = vertices.length;
      vertices.push({ x: 0, y: 74, z: 0 });

      faces.push({ indices: table, fill: 'rgba(224, 242, 254, 0.36)' });
      for (let i = 0; i < 8; i++) {
        const next = (i + 1) % 8;
        // Mặt Crown & Mặt Pavilion phản chiếu ánh sáng
        faces.push({
          indices: [table[i], table[next], girdle[next], girdle[i]],
          fill: i % 2 === 0 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(186, 230, 253, 0.2)',
        });
        faces.push({
          indices: [girdle[i], girdle[next], culetIdx],
          fill: i % 2 === 0 ? 'rgba(14, 165, 233, 0.25)' : 'rgba(224, 242, 254, 0.14)',
        });

        edges.push(
          { a: table[i], b: girdle[i], color: '#ffffff', width: 1.8, glow: true },
          { a: table[i], b: girdle[next], color: secondary, width: 1.1 },
          { a: girdle[i], b: culetIdx, color: accent, width: 1.9, glow: true },
          { a: innerCore[i], b: culetIdx, color: '#fbbf24', width: 0.9 },
        );
      }
      break;
    }

    case 'preset_diamond_ring': {
      // Vòng nhẫn bạch kim + ổ chấu + viên kim cương bát diện lấp lánh
      addRingLoop(vertices, edges, 0, 20, 0, 54, 24, 'xy', secondary, 2.4, true);
      addRingLoop(vertices, edges, 0, 20, 8, 54, 24, 'xy', accent, 1.6);
      addRingLoop(vertices, edges, 0, 20, -8, 54, 24, 'xy', accent, 1.6);
      // Viên kim cương trên đỉnh nhẫn (y = -48)
      const base = vertices.length;
      vertices.push(
        { x: 0, y: -88, z: 0 },
        { x: -24, y: -56, z: 0 },
        { x: 0, y: -56, z: 24 },
        { x: 24, y: -56, z: 0 },
        { x: 0, y: -56, z: -24 },
        { x: -16, y: -42, z: 0 },
        { x: 0, y: -42, z: 16 },
        { x: 16, y: -42, z: 0 },
        { x: 0, y: -42, z: -16 },
        { x: 0, y: -26, z: 0 },
      );
      const dEdges = [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 1],
        [1, 5],
        [2, 6],
        [3, 7],
        [4, 8],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 5],
        [5, 9],
        [6, 9],
        [7, 9],
        [8, 9],
      ];
      for (const [a, b] of dEdges) {
        edges.push({ a: base + a, b: base + b, color: '#e0f2fe', width: 2.1, glow: true });
      }
      faces.push(
        { indices: [base + 1, base + 2, base + 6, base + 5], fill: 'rgba(56, 189, 248, 0.3)' },
        { indices: [base + 2, base + 3, base + 7, base + 6], fill: 'rgba(186, 230, 253, 0.35)' },
        { indices: [base + 3, base + 4, base + 8, base + 7], fill: 'rgba(56, 189, 248, 0.25)' },
        { indices: [base + 4, base + 1, base + 5, base + 8], fill: 'rgba(125, 211, 252, 0.3)' },
      );
      break;
    }

    case 'preset_royal_ring': {
      // Nhẫn vàng hoàng gia gắn ngọc vuông
      addRingLoop(vertices, edges, 0, 18, 0, 56, 22, 'xy', secondary, 2.6, true);
      addRingLoop(vertices, edges, 0, 18, 12, 52, 22, 'xy', secondary, 1.5);
      addRingLoop(vertices, edges, 0, 18, -12, 52, 22, 'xy', secondary, 1.5);
      addBox(
        vertices,
        edges,
        faces,
        0,
        -44,
        0,
        44,
        20,
        34,
        secondary,
        'rgba(251, 191, 36, 0.28)',
        true,
      );
      addBox(
        vertices,
        edges,
        faces,
        0,
        -56,
        0,
        28,
        14,
        22,
        accent,
        'rgba(168, 85, 247, 0.45)',
        true,
      );
      break;
    }

    case 'preset_villa': {
      // Biệt thự kiến trúc 2 tầng hiện đại + mái vát + hồ bơi
      addBox(vertices, edges, faces, 0, 48, 0, 168, 10, 120, '#94a3b8', 'rgba(15, 23, 42, 0.7)');
      // Hồ bơi xanh ngọc phía trước
      addBox(
        vertices,
        edges,
        faces,
        44,
        42,
        34,
        62,
        6,
        42,
        '#22d3ee',
        'rgba(6, 182, 212, 0.35)',
        true,
      );
      // Tầng 1
      addBox(
        vertices,
        edges,
        faces,
        -16,
        18,
        -14,
        114,
        48,
        72,
        accent,
        'rgba(16, 185, 129, 0.2)',
        true,
      );
      // Tầng 2 nhô ban công
      addBox(
        vertices,
        edges,
        faces,
        6,
        -24,
        -8,
        128,
        38,
        66,
        secondary,
        'rgba(251, 191, 36, 0.22)',
        true,
      );
      // Mái hiện đại
      addBox(
        vertices,
        edges,
        faces,
        6,
        -48,
        -8,
        144,
        8,
        78,
        '#ffffff',
        'rgba(248, 250, 252, 0.22)',
        true,
      );
      break;
    }

    case 'preset_laptop': {
      // Đế bàn phím nằm ngang + màn hình gập mở góc 110 độ
      addBox(vertices, edges, faces, 0, 32, 18, 134, 8, 88, accent, 'rgba(30, 41, 59, 0.75)', true);
      // Trackpad & phím mô phỏng
      addBox(vertices, edges, faces, 0, 27, 42, 42, 2, 24, secondary, 'rgba(167, 139, 250, 0.25)');
      // Màn hình dựng nghiêng về sau
      const base = vertices.length;
      vertices.push(
        { x: -67, y: 28, z: -26 },
        { x: 67, y: 28, z: -26 },
        { x: 67, y: -56, z: -48 },
        { x: -67, y: -56, z: -48 },
        { x: -58, y: 20, z: -28 },
        { x: 58, y: 20, z: -28 },
        { x: 58, y: -48, z: -46 },
        { x: -58, y: -48, z: -46 },
      );
      for (const [a, b] of [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
      ]) {
        edges.push({
          a: base + a,
          b: base + b,
          color: a < 4 ? accent : '#38bdf8',
          width: 2,
          glow: true,
        });
      }
      faces.push({
        indices: [base + 4, base + 5, base + 6, base + 7],
        fill: 'rgba(56, 189, 248, 0.24)',
      });
      break;
    }

    case 'preset_keyboard': {
      // Khung bàn phím cơ CNC + các hàng keycap 3D nổi
      addBox(vertices, edges, faces, 0, 12, 0, 168, 18, 66, accent, 'rgba(15, 23, 42, 0.8)', true);
      for (let row = -1; row <= 1; row++) {
        for (let col = -3; col <= 3; col++) {
          addBox(
            vertices,
            edges,
            faces,
            col * 21,
            -2,
            row * 18,
            15,
            9,
            13,
            (col + row) % 2 === 0 ? secondary : accent,
            'rgba(6, 182, 212, 0.28)',
            true,
          );
        }
      }
      break;
    }

    case 'preset_phone': {
      // Khung điện thoại Flagship Titanium + cụm 3 camera + màn hình OLED
      addBox(vertices, edges, faces, 0, 0, 0, 68, 136, 10, accent, 'rgba(30, 41, 59, 0.78)', true);
      addBox(
        vertices,
        edges,
        faces,
        0,
        0,
        6,
        60,
        126,
        2,
        secondary,
        'rgba(34, 211, 238, 0.25)',
        true,
      );
      // Cụm camera mặt lưng
      addBox(
        vertices,
        edges,
        faces,
        -16,
        -42,
        -7,
        26,
        28,
        4,
        '#fbbf24',
        'rgba(15, 23, 42, 0.9)',
        true,
      );
      addRingLoop(vertices, edges, -20, -48, -10, 5, 10, 'xy', '#38bdf8', 1.5, true);
      addRingLoop(vertices, edges, -10, -38, -10, 5, 10, 'xy', '#38bdf8', 1.5, true);
      break;
    }

    case 'preset_headphone': {
      // Vòng chụp đầu 3D + 2 củ tai hình trụ phát sáng
      const archPoints: number[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const angle = Math.PI + (i / steps) * Math.PI;
        archPoints.push(vertices.length);
        vertices.push({
          x: Math.cos(angle) * 62,
          y: Math.sin(angle) * 62 - 6,
          z: 0,
        });
      }
      for (let i = 0; i < archPoints.length - 1; i++) {
        edges.push({
          a: archPoints[i],
          b: archPoints[i + 1],
          color: secondary,
          width: 3.2,
          glow: true,
        });
      }
      // Hai củ loa hai bên
      addRingLoop(vertices, edges, -62, 16, 0, 26, 18, 'yz', accent, 2.2, true);
      addRingLoop(vertices, edges, -74, 16, 0, 22, 18, 'yz', secondary, 1.6, true);
      addRingLoop(vertices, edges, 62, 16, 0, 26, 18, 'yz', accent, 2.2, true);
      addRingLoop(vertices, edges, 74, 16, 0, 22, 18, 'yz', secondary, 1.6, true);
      break;
    }
  }

  return { vertices, edges, faces };
}

function projectPoint(
  p: Point3D,
  rx: number,
  ry: number,
  rz: number,
  cx: number,
  cy: number,
  scale: number,
): { x: number; y: number; z: number } {
  // Rotate around Y
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  // Rotate around X
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  // Rotate around Z
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  const fov = 420;
  const perspective = fov / (fov + z2 + 120);
  return {
    x: cx + x3 * perspective * scale,
    y: cy + y3 * perspective * scale,
    z: z2,
  };
}

interface Museum3DCanvasProps {
  presetKey: Preset3DModelKey;
  accentColor: string;
  secondaryColor: string;
  modelLabel: string;
}

/**
 * Bộ dựng khối 3D thời gian thực bằng phép chiếu phối cảnh HTML5 Canvas (60 FPS).
 */
export const Museum3DCanvas: React.FC<Museum3DCanvasProps> = ({
  presetKey,
  accentColor,
  secondaryColor,
  modelLabel,
}) => {
  const { t } = useTranslation('auction');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mesh = buildPresetMesh(presetKey, accentColor, secondaryColor);
    let animId = 0;
    let angle = 0;

    // Hạt bụi vàng bay lơ lửng trong ánh đèn bảo tàng
    const motes = Array.from({ length: 28 }, (_, i) => ({
      x: Math.sin(i * 1.9) * 140,
      y: Math.cos(i * 2.7) * 110,
      z: Math.sin(i * 3.1) * 110,
      speed: 0.005 + (i % 5) * 0.002,
      size: 1.2 + (i % 3) * 0.7,
    }));

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 440;
      const height = canvas.clientHeight || 360;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.45;
      const scale = Math.min(width, height) / 285;
      angle += 0.015;

      const rx = 0.24 + Math.sin(angle * 0.6) * 0.08;
      const ry = angle;
      const rz = Math.sin(angle * 0.4) * 0.05;

      // Chùm sáng rọi sân khấu từ trần chiếu xuống vật phẩm
      ctx.save();
      const coneGrad = ctx.createLinearGradient(cx, 0, cx, cy + 125 * scale);
      coneGrad.addColorStop(0, `${accentColor}26`);
      coneGrad.addColorStop(0.55, `${secondaryColor}12`);
      coneGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 42 * scale, 0);
      ctx.lineTo(cx + 42 * scale, 0);
      ctx.lineTo(cx + 135 * scale, cy + 115 * scale);
      ctx.lineTo(cx - 135 * scale, cy + 115 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Bục kính trưng bày cao cấp bên dưới vật thể kèm mặt gương & thước xoay 360°
      ctx.save();
      const pedestalY = cy + 106 * scale;
      const pedGrad = ctx.createRadialGradient(cx, pedestalY, 8, cx, pedestalY, 132 * scale);
      pedGrad.addColorStop(0, `${accentColor}55`);
      pedGrad.addColorStop(0.55, 'rgba(15, 23, 42, 0.72)');
      pedGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pedGrad;
      ctx.beginPath();
      ctx.ellipse(cx, pedestalY, 132 * scale, 28 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${accentColor}cc`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, pedestalY, 100 * scale, 21 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `${secondaryColor}77`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, pedestalY + 12 * scale, 114 * scale, 24 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Vạch chia độ xoay quanh bục
      for (let t = 0; t < 16; t++) {
        const deg = angle * 0.6 + (t * Math.PI * 2) / 16;
        const tx = cx + Math.cos(deg) * 107 * scale;
        const ty = pedestalY + Math.sin(deg) * 22.5 * scale;
        ctx.fillStyle = t % 4 === 0 ? `${accentColor}ee` : `${secondaryColor}88`;
        ctx.beginPath();
        ctx.arc(tx, ty, t % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Chiếu điểm ảnh 3D của model
      const projected = mesh.vertices.map((v) => projectPoint(v, rx, ry, rz, cx, cy, scale));

      // Vẽ mặt đa giác (sắp xếp theo độ sâu z)
      if (mesh.faces && mesh.faces.length > 0) {
        const sortedFaces = mesh.faces
          .map((face) => {
            const avgZ =
              face.indices.reduce((sum, idx) => sum + (projected[idx]?.z ?? 0), 0) /
              face.indices.length;
            return { face, avgZ };
          })
          .sort((a, b) => b.avgZ - a.avgZ);

        for (const { face } of sortedFaces) {
          ctx.beginPath();
          face.indices.forEach((idx, i) => {
            const pt = projected[idx];
            if (!pt) return;
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fillStyle = face.fill;
          ctx.fill();
        }
      }

      // Vẽ khung cạnh phát sáng 3D
      for (const edge of mesh.edges) {
        const p1 = projected[edge.a];
        const p2 = projected[edge.b];
        if (!p1 || !p2) continue;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = edge.color || accentColor;
        ctx.lineWidth = edge.width || 1.4;
        if (edge.glow) {
          ctx.shadowColor = edge.color || accentColor;
          ctx.shadowBlur = 12;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Vẽ hạt bụi ánh sáng xung quanh bục bảo tàng
      motes.forEach((m, idx) => {
        const pt = projectPoint(
          {
            x: m.x,
            y: m.y + Math.sin(angle * 2 + idx) * 10,
            z: m.z,
          },
          0.1,
          angle * 0.5,
          0,
          cx,
          cy,
          scale,
        );
        ctx.fillStyle = idx % 2 === 0 ? `${accentColor}cc` : `${secondaryColor}aa`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animId);
  }, [presetKey, accentColor, secondaryColor]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        aria-label={t('showcase.canvasAria', { label: modelLabel })}
        className="w-full h-full max-w-[480px] max-h-[380px]"
      />
      <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-slate-950/75 px-3.5 py-1 text-[11px] font-mono font-semibold tracking-wider text-amber-200 shadow-lg backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span>{t('showcase.hologramTag', { label: modelLabel.toUpperCase() })}</span>
      </div>
    </div>
  );
};
