'use client';

import { SHAPE_PATHS } from '@/lib/calendar/constants';
import type { ShapeEl } from '@/lib/calendar/types';
import { useShapeElementHandler } from './useShapeElementHandler';

export default function ShapeElement({ el }: { el: ShapeEl }) {
  const { w, h, fill, sw, stroke, r, lineW, holeCount, kind, petals } = useShapeElementHandler(el);

  if (kind === 'holes') {
    return (
      <div className="holes">
        {Array.from({ length: holeCount }, (_, i) => <i key={i} style={{ background: fill }} />)}
      </div>
    );
  }
  if (kind === 'flower') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {petals.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={22} fill={fill} />)}
        <circle cx={50} cy={50} r={17} fill="#ffe08a" />
      </svg>
    );
  }
  if (kind === 'path') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={SHAPE_PATHS[el.shape] || SHAPE_PATHS.blob} fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" opacity={el.shape === 'tape' ? 0.8 : undefined} />
      </svg>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {kind === 'box' && <rect x={sw / 2} y={sw / 2} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} />}
      {kind === 'ellipse' && <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, (w - sw) / 2)} ry={Math.max(0, (h - sw) / 2)} fill={fill} stroke={stroke} strokeWidth={sw} />}
      {kind === 'line' && <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={el.stroke} strokeWidth={lineW} strokeDasharray={el.dash ? `${lineW * 3} ${lineW * 2.5}` : undefined} strokeLinecap="round" />}
    </svg>
  );
}
