'use client';

import { useToastHandler } from './useToastHandler';

export default function Toast() {
  const { msg, show } = useToastHandler();
  return <div className={`toast${show ? ' show' : ''}`} role="status">{msg}</div>;
}
