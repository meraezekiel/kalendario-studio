import { SHAPES } from '@/lib/calendar/constants';
import { mkShape } from '@/lib/calendar/factories';
import { addBackground, addPreset, addShape } from '@/store/actions';

/** Small fixed-size shapes used as button icons. */
const MINI = SHAPES.map(([kind, label]) => ({
  kind,
  label,
  el: mkShape({ shape: kind, w: 30, h: 24, fill: '#9b8fb0', stroke: '#6c6577', sw: kind === 'line' ? 3 : 0, radius: kind === 'rounded' ? 25 : 0 }),
}));

export function useAddPanelHandler() {
  return { shapes: MINI, addPreset, addShape, addBackground };
}
