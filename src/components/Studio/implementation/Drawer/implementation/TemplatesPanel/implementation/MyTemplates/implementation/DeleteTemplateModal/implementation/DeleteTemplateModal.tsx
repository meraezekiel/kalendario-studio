'use client';

import Modal from '@/components/Modal/implementation/Modal';
import type { MyTemplate } from '@/lib/templates/myTemplates';
import { useDeleteTemplateModalHandler } from './useDeleteTemplateModalHandler';

export default function DeleteTemplateModal({ template, onClose }: { template: MyTemplate; onClose: () => void }) {
  const h = useDeleteTemplateModalHandler(template.id, onClose);
  return (
    <Modal
      title="Delete this template?"
      onClose={onClose}
      testId="delete-template-modal"
      actions={
        <>
          <button type="button" className="btn" onClick={onClose} data-autofocus>Cancel</button>
          <button type="button" className="btn solid-danger" onClick={h.confirm}>Delete</button>
        </>
      }
    >
      <p>
        “<b>{template.name}</b>” will be removed from My templates. This can&apos;t be undone.
      </p>
      <p className="hint">Your current calendar is not affected.</p>
    </Modal>
  );
}
