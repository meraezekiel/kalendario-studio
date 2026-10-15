import { useMyTemplatesStore } from '@/store/useMyTemplatesStore';

export function useDeleteTemplateModalHandler(id: string, onClose: () => void) {
  return {
    confirm: async () => {
      await useMyTemplatesStore.getState().remove(id);
      onClose();
    },
  };
}
