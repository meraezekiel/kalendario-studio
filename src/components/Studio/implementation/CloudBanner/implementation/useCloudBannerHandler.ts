import { useAccessLostHandler } from './handler/useAccessLostHandler';
import { useMigrateOfferHandler } from './handler/useMigrateOfferHandler';

/** The editor's account banner: lost access in a cloud design, or the offer to save the local calendar. */
export function useCloudBannerHandler(cloud: boolean) {
  return { lost: useAccessLostHandler(cloud), offer: useMigrateOfferHandler(cloud) };
}
