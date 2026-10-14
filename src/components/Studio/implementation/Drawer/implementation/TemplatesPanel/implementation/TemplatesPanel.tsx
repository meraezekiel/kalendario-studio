'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import PageView from '@/components/PageView/implementation/PageView';
import { useTemplatesPanelHandler } from './useTemplatesPanelHandler';

export default function TemplatesPanel() {
  const { items, choose } = useTemplatesPanelHandler();
  return (
    <section>
      <h3>Start from a template</h3>
      <p className="hint" style={{ marginBottom: 12 }}>
        Every part of a template can be moved, resized, restyled or deleted. Picking one replaces your current calendar, and Undo brings it back.
      </p>
      <div className="tplgrid">
        {items.map((t) => {
          const thumb = (
            <div className="thumb" style={{ height: t.height }}>
              <div style={{ transform: `scale(${t.scale})` }}>
                <PageView page={t.page} />
              </div>
            </div>
          );
          return (
            <ConfirmButton
              key={t.key}
              className="tpl"
              onConfirm={() => choose(t.key)}
              confirmLabel={<>{thumb}<span className="tl">Click again to replace your calendar</span></>}
            >
              {thumb}
              <span className="tl">{t.name}</span>
            </ConfirmButton>
          );
        })}
      </div>
    </section>
  );
}
