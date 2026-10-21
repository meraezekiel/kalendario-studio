import type { TideStation } from './tide';
import stations from './tideStations.json';
import towns from './tideTowns.json';

/**
 * Ports with tide gauge records (UHSLC, fitted by scripts/build-tides.mjs) and towns without one (the EOT20 tide model,
 * scripts/build-tide-towns.mjs), in one list by name. JSON only types the pairs as number[].
 */
export const TIDE_GAUGES = stations as unknown as TideStation[];
export const TIDE_PLACES = [...TIDE_GAUGES, ...(towns as unknown as TideStation[])].sort((a, b) => a.name.localeCompare(b.name));

export const TIDE_HI_COLOR = '#1d5fbf';
export const TIDE_LO_COLOR = '#d62828';

export const tidePlace = (id: string | undefined) => TIDE_PLACES.find((p) => p.id === id);
