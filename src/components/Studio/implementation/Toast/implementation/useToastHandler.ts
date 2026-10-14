import { useEffect, useState } from 'react';
import { useStudioStore } from '@/store/useStudioStore';

export function useToastHandler() {
  const toast = useStudioStore((s) => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(t);
  }, [toast]);
  return { msg: toast?.msg ?? '', show };
}
