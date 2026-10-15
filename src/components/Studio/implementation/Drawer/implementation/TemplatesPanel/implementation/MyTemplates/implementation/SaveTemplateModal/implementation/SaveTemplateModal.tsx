'use client';

import Modal from '@/components/Modal/implementation/Modal';
import { NAME_MAX } from '@/lib/templates/myTemplates';
import { useSaveTemplateModalHandler } from './useSaveTemplateModalHandler';

export default function SaveTemplateModal({ onClose }: { onClose: () => void }) {
  const h = useSaveTemplateModalHandler(onClose);
  return (
    <Modal
      title="Save as a template"
      onClose={onClose}
      testId="save-template-modal"
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="save-template-form" className="btn primary" disabled={h.busy || !h.name.trim()}>Save template</button>
        </>
      }
    >
      <form id="save-template-form" onSubmit={h.submit}>
        <p>Saves every page of this calendar, photos included, to My templates.</p>
        <label className="f">
          Template name
          <input type="text" data-autofocus value={h.name} maxLength={NAME_MAX} onChange={(e) => h.setName(e.target.value)} onFocus={(e) => e.target.select()} />
        </label>
      </form>
    </Modal>
  );
}
