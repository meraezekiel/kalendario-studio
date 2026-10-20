'use client';

import type { CellView } from '../../useCalendarElementHandler';
import MoonIcon from './MoonIcon/implementation/MoonIcon';
import TideIcon from './TideIcon/implementation/TideIcon';
import TideRow from './TideRow/implementation/TideRow';
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
      {cell.tideRows ? (
        <>
          <TideRow slots={cell.tideRows.high} style={cell.tideRows.style} kind="high" />
          {/* The holiday name sits above the low tides at the bottom of the box. */}
          <div className="foot">
            {cell.label && <span className="lbl" style={cell.labelStyle}>{cell.label}</span>}
            <TideRow slots={cell.tideRows.low} style={cell.tideRows.style} kind="low" />
          </div>
        </>
      ) : (
        cell.label && <span className="lbl" style={cell.labelStyle}>{cell.label}</span>
      )}
      {cell.moon?.big && <MoonIcon moon={cell.moon} />}
      {(cell.tide || (cell.moon && !cell.moon.big)) && (
        // Small marks share the top-right corner, the tide left of the moon.
        <span className="marks">
          {cell.tide && <TideIcon tide={cell.tide} />}
          {cell.moon && !cell.moon.big && <MoonIcon moon={cell.moon} />}
        </span>
      )}
    </div>
  );
}
