import { relativeTime } from '../../DesignCard/implementation/useDesignCardHandler';

export function useSignUpRequestsHandler() {
  return {
    /** "5 minutes ago", "yesterday", … */
    when: (iso: string) => relativeTime(iso),
  };
}
