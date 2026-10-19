'use client';

import ArrangeSection from './ArrangeSection/implementation/ArrangeSection';
import CalendarSection from './CalendarSection/implementation/CalendarSection';
import DaySection from './DaySection/implementation/DaySection';
import EventsSection from './EventsSection/implementation/EventsSection';
import GraphicSection from './GraphicSection/implementation/GraphicSection';
import ImageSection from './ImageSection/implementation/ImageSection';
import LayersSection from './LayersSection/implementation/LayersSection';
import MultiSection from './MultiSection/implementation/MultiSection';
import PageSection from './PageSection/implementation/PageSection';
import ShapeSection from './ShapeSection/implementation/ShapeSection';
import TextSection from './TextSection/implementation/TextSection';
import { useInspectorHandler } from './useInspectorHandler';

/** Right-hand panel: settings for the selected element, or for the page when nothing is selected. */
export default function Inspector() {
  const { el, selDay, title, multi, readOnly } = useInspectorHandler();
  return (
    <aside className="insp" aria-label="Selected element">
      <p className="ititle" data-testid="insp-title">{title}</p>
      {/* A view-only design: every setting shows but none can change. */}
      <fieldset className="edit-lock" disabled={readOnly}>
        {multi && <MultiSection />}
        {!el && !multi && <PageSection />}
        {el?.type === 'cal' && selDay != null && <DaySection key={`${el.id}-${selDay}`} el={el} day={selDay} />}
        {el?.type === 'text' && <TextSection el={el} />}
        {el?.type === 'image' && <ImageSection el={el} />}
        {el?.type === 'shape' && <ShapeSection el={el} />}
        {el?.type === 'cal' && <CalendarSection el={el} />}
        {el?.type === 'events' && <EventsSection el={el} />}
        {el?.type === 'graphic' && <GraphicSection el={el} />}
        {el && <ArrangeSection key={el.id} el={el} />}
        <LayersSection />
      </fieldset>
    </aside>
  );
}
