import { useCloudStore } from '@/store/useCloudStore';

/** The pending whole-design confirmation, if any, and its answers. */
export function useReplaceConfirmHandler() {
  const replacing = useCloudStore((s) => s.replacing);
  const answer = useCloudStore((s) => s.answerReplace);
  return {
    message: replacing ? `${replacing.who} ${replacing.many ? 'are' : 'is'} also editing. This replaces all pages.` : null,
    replace: () => answer(true),
    cancel: () => answer(false),
  };
}
