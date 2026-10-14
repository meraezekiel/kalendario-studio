'use client';

import GraphicTile from './GraphicTile/implementation/GraphicTile';
import PackCard from './PackCard/implementation/PackCard';
import { PREVIEW, useGraphicsPanelHandler } from './useGraphicsPanelHandler';

/** Library of illustrations and gradients: search, recently used, and categories. */
export default function GraphicsPanel() {
  const h = useGraphicsPanelHandler();
  return (
    <section>
      <h3>Graphics</h3>
      <input
        type="search"
        className="gsearch"
        placeholder="Search graphics, e.g. heart, pasko, mango"
        aria-label="Search graphics"
        value={h.query}
        onChange={(e) => h.setQuery(e.target.value)}
      />
      {h.searching ? (
        h.results.length ? (
          <div className="ggrid" data-testid="graphic-results">
            {h.results.map((g) => <GraphicTile key={g.key} g={g} onAdd={h.add} onDragStart={h.onDragStart} />)}
          </div>
        ) : (
          <p className="hint">No graphics match “{h.query}”. Try another word.</p>
        )
      ) : (
        <>
          {h.recent.length > 0 && !h.open && (
            <div className="gcat">
              <div className="ghead"><b>Recently used</b></div>
              <div className="ggrid" data-testid="graphic-recent">
                {h.recent.slice(0, PREVIEW).map((g) => <GraphicTile key={g.key} g={g} onAdd={h.add} onDragStart={h.onDragStart} />)}
              </div>
            </div>
          )}
          {h.open && <button className="btn" style={{ width: '100%', marginBottom: 10 }} onClick={h.back}>← All graphics</button>}
          {h.packs.length > 0 && (
            <div className="gcat">
              <div className="ghead"><b>Illustration packs</b></div>
              <div className="packs">{h.packs.map((p) => <PackCard key={p.id} pack={p} onOpen={h.seeAll} />)}</div>
            </div>
          )}
          {h.categories.map((c) => (
            <div className="gcat" key={c.id} data-testid={`graphic-cat-${c.id}`}>
              <div className="ghead">
                <b>{c.label}</b>
                {!h.open && c.items.length > PREVIEW && <button className="linkbtn" onClick={() => h.seeAll(c.id)}>See all</button>}
              </div>
              <div className="ggrid">
                {(h.open ? c.items : c.items.slice(0, PREVIEW)).map((g) => <GraphicTile key={g.key} g={g} onAdd={h.add} onDragStart={h.onDragStart} />)}
              </div>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 6 }}>Click a graphic to add it, or drag it onto the page. Stickers: Fluent Emoji by Microsoft (MIT). People: Open Peeps by Pablo Stanley (CC0). Zodiac glyphs: Material Design Icons (Apache-2.0).</p>
        </>
      )}
    </section>
  );
}
