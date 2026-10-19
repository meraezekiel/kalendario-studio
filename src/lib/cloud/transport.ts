/** Moves a design's Yjs updates to and from the server log. */
export interface SyncTransport {
  load(): Promise<{ state: string; through: number; updates: { id: number; data: string }[] }>;
  push(data: string): Promise<{ id: number }>;
  subscribe(onUpdate: (u: { id: number; data: string; author: string }) => void, onStatus: (s: 'live' | 'offline') => void): () => void;
  compact(state: string, through: number): Promise<boolean>;
}

/** A failed cloud call, by cause. */
export class CloudError extends Error {
  constructor(public code: 'denied' | 'offline' | 'auth' | 'limit', message?: string) {
    super(message ?? code);
    this.name = 'CloudError';
  }
}
