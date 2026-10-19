'use client';

import ConfirmButton from '@/components/ConfirmButton/implementation/ConfirmButton';
import PageView from '@/components/PageView/implementation/PageView';
import DeleteTemplateModal from './DeleteTemplateModal/implementation/DeleteTemplateModal';
import SaveTemplateModal from './SaveTemplateModal/implementation/SaveTemplateModal';
import { useMyTemplatesHandler } from './useMyTemplatesHandler';

/** Templates the user saved from their own designs; only these can be deleted. */
export default function MyTemplates() {
  const h = useMyTemplatesHandler();
  return (
    <section data-testid="my-templates">
      <h3>My templates</h3>
      <button className="btn primary" style={{ width: '100%', marginBottom: 10 }} onClick={h.openSave}>Save this design as a template</button>
      {h.loaded && !h.items.length && (
        <p className="hint">Save a design you like to reuse it next time. Your templates {h.inAccount ? 'are kept in your account' : 'stay in this browser'}, and only templates you saved can be deleted.</p>
      )}
      {h.items.length > 0 && (
        <div className="tplgrid">
          {h.items.map((t) => {
            const thumb = (
              <div className="thumb" style={{ height: t.height }}>
                <div style={{ transform: `scale(${t.scale})` }}>
                  <PageView page={t.page} assets={t.assets} />
                </div>
              </div>
            );
            return (
              <div key={t.id} className="mytpl">
                <ConfirmButton className="tpl" onConfirm={() => h.apply(t.id)} confirmLabel={<>{thumb}<span className="tl">Click again to replace your calendar</span></>}>
                  {thumb}
                  <span className="tl">{t.name}</span>
                </ConfirmButton>
                <button type="button" className="tpl-del" aria-label={`Delete template ${t.name}`} title="Delete template" onClick={() => h.askDelete(t.id)}>×</button>
              </div>
            );
          })}
        </div>
      )}
      {h.saving && <SaveTemplateModal onClose={h.closeSave} />}
      {h.deleting && <DeleteTemplateModal template={h.deleting} onClose={h.closeDelete} />}
    </section>
  );
}
