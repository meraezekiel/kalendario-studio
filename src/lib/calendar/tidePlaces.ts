import type { TideStation } from './tide';
import stations from './tideStations.json';

/** Ports with tide gauge records (UHSLC), fitted by scripts/build-tides.mjs. JSON only types the pairs as number[]. */
export const TIDE_PLACES = stations as unknown as TideStation[];

export const TIDE_HI_COLOR = '#1d5fbf';
export const TIDE_LO_COLOR = '#d62828';

export const tidePlace = (id: string | undefined) => TIDE_PLACES.find((p) => p.id === id);
