'use client';

import CheckField from '@/components/Fields/CheckField/implementation/CheckField';
import ColorField from '@/components/Fields/ColorField/implementation/ColorField';
import FontField from '@/components/Fields/FontField/implementation/FontField';
import NumField from '@/components/Fields/NumField/implementation/NumField';
import RangeField from '@/components/Fields/RangeField/implementation/RangeField';
import Section from '@/components/Fields/Section/implementation/Section';
import SegField from '@/components/Fields/SegField/implementation/SegField';
import SelectField from '@/components/Fields/SelectField/implementation/SelectField';
import TextField from '@/components/Fields/TextField/implementation/TextField';
import type { CalEl } from '@/lib/calendar/types';
import { useCalendarSectionHandler } from './useCalendarSectionHandler';

export default function CalendarSection({ el }: { el: CalEl }) {
  const h = useCalendarSectionHandler(el);
  const { bind } = h;
  return (
    <>
      <Section title="Month">
        <SelectField label="Shows" options={h.moOptions} {...bind('mo')} />
        <SegField label="Week starts" options={[[0, 'Sunday'], [1, 'Monday']] as const} {...bind('startDay')} />
        <p className="hint">Click a day once the calendar is selected to edit that day.</p>
      </Section>
      <Section title="Header bar" open={el.head}>
        <CheckField label="Show header bar" {...bind('head')} />
        {el.head && (
          <>
            <TextField label="Text" {...bind('headText')} />
            <p className="hint" style={{ margin: '-4px 0 10px' }}>Use | to spread parts apart, e.g. {'{YEAR}|{MONTH}|{YEAR}'}</p>
            <FontField label="Font" {...bind('headFont')} />
            <div className="g2">
              <ColorField label="Text color" {...bind('headColor')} />
              <ColorField label="Bar color" {...bind('headBg')} onClear={h.clearHeadBg} />
            </div>
            <SegField label="Align" options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']] as const} {...bind('headAlign')} />
            <RangeField label="Height" min={0.5} max={2.5} step={0.05} {...bind('headScale')} />
          </>
        )}
      </Section>
      <Section title="Weekday names" open={false}>
        <CheckField label="Show weekday names" {...bind('wk')} />
        {el.wk && (
          <>
            <SegField label="Style" options={[['plain', 'Plain'], ['bar', 'Bar'], ['pills', 'Pills']] as const} {...bind('wkStyle')} />
            <SegField label="Names" options={[['short', 'SUN'], ['long', 'SUNDAY'], ['letter', 'S']] as const} {...bind('wkLen')} />
            <FontField label="Font" {...bind('wkFont')} />
            <div className="g2">
              <ColorField label="Text color" {...bind('wkColor')} />
              {el.wkStyle !== 'plain' && <ColorField label="Background" {...bind('wkBg')} />}
            </div>
            {el.wkStyle === 'pills' && <CheckField label="Rainbow colors" {...bind('rainbow')} />}
          </>
        )}
      </Section>
      <Section title="Day numbers" open={false}>
        <FontField label="Font" {...bind('numFont')} />
        <div className="g2">
          <ColorField label="Color" {...bind('numColor')} />
          <ColorField label="Red days color" {...bind('hiColor')} />
        </div>
        <SegField label="Position" options={[['center', 'Center'], ['tl', 'Top left'], ['tr', 'Top right']] as const} {...bind('numPos')} />
        <RangeField label="Size" min={0.3} max={1.8} step={0.05} {...bind('numScale')} />
        <CheckField label="Bold" {...bind('numBold')} />
        <div className="lab">Red days</div>
        <div className="dows">
          {h.weekdays.map((d) => (
            <button key={d.i} type="button" className={d.on ? 'on' : ''} aria-pressed={d.on} onClick={() => h.toggleHiDay(d.i)}>{d.label}</button>
          ))}
        </div>
        <CheckField label="Show holiday names in the boxes" {...bind('labels')} />
        <CheckField label="Moon phases" value={!!el.moon} onChange={(v) => bind('moon').onChange(v)} />
        <CheckField label="Side calendar (last / next month)" value={!!el.side} onChange={(v) => bind('side').onChange(v)} />
        <p className="hint">Moon phases fill the empty boxes (Philippine time). Side calendars are skipped when counting months for “Fill the rest of the year”.</p>
      </Section>
      <Section title="Grid & boxes" open={false}>
        <CheckField label="Grid lines" {...bind('lines')} />
        <div className="g2">
          <ColorField label="Line color" {...bind('lineColor')} />
          <ColorField label="Box color" {...bind('cellBg')} onClear={h.clearCellBg} />
        </div>
        <RangeField label="Space between boxes" min={0} max={24} {...bind('gap')} />
        <RangeField label="Box corners" min={0} max={30} {...bind('radius')} />
        <div className="g2">
          <NumField label="Outer border" step={0.5} {...bind('border')} />
          <ColorField label="Border color" {...bind('borderColor')} />
        </div>
        <CheckField label="Show other months' days" {...bind('adjacent')} />
      </Section>
    </>
  );
}
