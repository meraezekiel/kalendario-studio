export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export const r1 = (v: number) => Math.round(v * 10) / 10;
export const isHex = (v: string | undefined) => /^#[0-9a-f]{6}$/i.test(v || '');
