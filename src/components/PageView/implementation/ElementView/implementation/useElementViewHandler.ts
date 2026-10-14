import type { CSSProperties } from 'react';
import type { El } from '@/lib/calendar/types';
import { r1 } from '@/lib/calendar/utils';

export function useElementViewHandler(el: El, crop: boolean) {
  const style: CSSProperties = {
    left: r1(el.x),
    top: r1(el.y),
    width: r1(el.w),
    height: r1(el.h),
    transform: `rotate(${el.rot || 0}deg)`,
    opacity: el.op,
  };
  const className = `el el-${el.type}${crop ? ' crop' : ''}`;
  return { style, className };
}
