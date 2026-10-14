'use client';

import ShapeElement from '@/components/PageView/implementation/ElementView/implementation/ShapeElement/implementation/ShapeElement';
import { useAddPanelHandler } from './useAddPanelHandler';

export default function AddPanel() {
  const { shapes, addPreset, addShape } = useAddPanelHandler();
  return (
    <>
      <section>
        <h3>Text</h3>
        <div className="addtx">
          <button className="btn" onClick={() => addPreset('h1')} style={{ font: '600 22px Fredoka,sans-serif' }}>Add a heading</button>
          <button className="btn" onClick={() => addPreset('h2')} style={{ font: '600 16px Poppins,sans-serif' }}>Add a subheading</button>
          <button className="btn" onClick={() => addPreset('body')} style={{ font: '400 13px Poppins,sans-serif' }}>Add body text</button>
          <button className="btn" onClick={() => addPreset('script')} style={{ font: '700 22px Caveat,cursive' }}>Script caption</button>
        </div>
      </section>
      <section>
        <h3>Calendar parts</h3>
        <div className="g2">
          <button className="btn" onClick={() => addPreset('cal')}>Month table</button>
          <button className="btn" onClick={() => addPreset('calbar')}>Table with header bar</button>
          <button className="btn" onClick={() => addPreset('events')}>Holiday list</button>
          <button className="btn" onClick={() => addPreset('month')}>Month name</button>
          <button className="btn" onClick={() => addPreset('year')}>Year</button>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Each new table shows the next month, so you can build a 3- or 12-month sheet. Month name and Year change on every page by themselves.
        </p>
      </section>
      <section>
        <h3>Photo frames</h3>
        <div className="g3">
          <button className="btn" onClick={() => addPreset('photo')}>Frame</button>
          <button className="btn" onClick={() => addPreset('circle')}>Circle</button>
          <button className="btn" onClick={() => addPreset('polaroid')}>Polaroid</button>
        </div>
      </section>
      <section>
        <h3>Shapes &amp; decorations</h3>
        <div className="g4 shapes">
          {shapes.map((s) => (
            <button key={s.kind} className="btn" onClick={() => addShape(s.kind)}>
              <span style={{ display: 'block', width: 30, height: 24 }}><ShapeElement el={s.el} /></span>
              {s.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
