import { useCloudStore } from '@/store/useCloudStore';
import { curPage, useStudioStore } from '@/store/useStudioStore';

/** Outlines for what other people on this page have selected, each in that person's colour. */
export function useOthersOverlayHandler() {
  const others = useCloudStore((s) => s.others);
  const cur = useStudioStore((s) => s.doc.cur);
  const page = useStudioStore((s) => curPage(s.doc));
  const byId = new Map(page.els.map((e) => [e.id, e]));
  return others
    .filter((p) => p.page === cur)
    .flatMap((p) =>
      p.sel
        .map((id) => byId.get(id))
        .filter((e) => !!e && !e.hidden)
        .map((e, i) => ({
          key: `${p.key}:${e!.id}`,
          id: e!.id,
          name: i === 0 ? p.name : null,
          style: {
            left: e!.x,
            top: e!.y,
            width: e!.w,
            height: e!.h,
            transform: `rotate(${e!.rot || 0}deg)`,
            '--who': p.color,
          } as React.CSSProperties,
        })),
    );
}
