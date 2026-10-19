'use client';

import type { CellView } from '../../useCalendarElementHandler';
import MoonIcon from './MoonIcon/implementation/MoonIcon';
import { useDayCellHandler } from './useDayCellHandler';

interface Props {
  cell: CellView;
  calId: string;
  editing: boolean;
}

export default function DayCell({ cell, calId, editing }: Props) {
  const { ref, commit, onKeyDown, img } = useDayCellHandler(calId, cell.day, cell.num, editing, cell.img);
  return (
    <div className={`${cell.className}${img ? ' hasimg' : ''}`} data-day={cell.day ?? undefined} style={cell.style}>
      {img && <div className="cimg" style={{ backgroundImage: `url('${img}')` }} />}
      {cell.num != null &&
        (editing ? (
          // Separate key: the editable span's text is owned by the browser while typing, not React.
          <span key="edit" ref={ref} className="num" style={cell.numStyle} contentEditable suppressContentEditableWarning onBlur={commit} onKeyDown={onKeyDown} data-testid="day-editor" />
        ) : (
          <span key="view" className="num" style={cell.numStyle}>{cell.num}</span>
        ))}
      {cell.label && <span className="lbl" style={cell.labelStyle}>{cell.label}</span>}
      {cell.moon && <MoonIcon moon={cell.moon} />}
    </div>
  );
}
