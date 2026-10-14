'use client';

import Section from '@/components/Fields/Section/implementation/Section';
import { useLayersSectionHandler } from './useLayersSectionHandler';

export default function LayersSection() {
  const { layers, pick, toggleHidden, toggleLocked } = useLayersSectionHandler();
  return (
    <Section title="Layers">
      {layers.length ? (
        <div className="layers" data-testid="layers">
          {layers.map((l) => (
            <div key={l.id} className={`layer${l.on ? ' on' : ''}${l.hidden ? ' off' : ''}`} onClick={(e) => pick(l.id, e.shiftKey || e.ctrlKey || e.metaKey)}>
              <b>{l.type}</b>
              <span>{l.name}</span>
              <button title={l.hidden ? 'Show' : 'Hide'} aria-label={l.hidden ? `Show ${l.name}` : `Hide ${l.name}`} onClick={(e) => { e.stopPropagation(); toggleHidden(l.id); }}>
                {l.hidden ? '◌' : '●'}
              </button>
              <button title={l.locked ? 'Unlock' : 'Lock'} aria-label={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`} onClick={(e) => { e.stopPropagation(); toggleLocked(l.id); }}>
                {l.locked ? '🔒' : '🔓'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">This page is empty. Add something from the Add tab.</p>
      )}
    </Section>
  );
}
