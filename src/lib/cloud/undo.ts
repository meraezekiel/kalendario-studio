import * as Y from 'yjs';
import { LOCAL } from './sync';
import { ROOT } from './ydoc';

/** Per-person undo over a shared design. `undo`/`redo` return false when there was nothing to do. */
export interface UndoDriver {
  undo(): boolean;
  redo(): boolean;
  /** Ends the current step: the next change starts a new one. */
  stop(): void;
  destroy(): void;
}

/**
 * Undo/redo of this person's own (LOCAL) changes only; collaborators' edits and untracked changes are left
 * alone. Undo writes straight to the Y.Doc, so the sync engine both pushes it and refreshes the store;
 * `onApplied` runs after each undo/redo that changed something;
 * `onStacks` hears whether there is anything to undo or redo whenever that may have changed.
 */
export function makeUndoDriver(
  ydoc: Y.Doc,
  onApplied: () => void,
  onStacks?: (can: { undo: boolean; redo: boolean }) => void,
): UndoDriver {
  const um = new Y.UndoManager(ydoc.getMap(ROOT), { trackedOrigins: new Set([LOCAL]), captureTimeout: 1200 });
  if (onStacks) {
    const report = () => onStacks({ undo: um.undoStack.length > 0, redo: um.redoStack.length > 0 });
    um.on('stack-item-added', report);
    um.on('stack-item-popped', report);
    um.on('stack-cleared', report);
  }
  const run = (stack: unknown[], fn: () => unknown) => {
    if (!stack.length) return false;
    fn();
    onApplied();
    return true;
  };
  return {
    undo: () => run(um.undoStack, () => um.undo()),
    redo: () => run(um.redoStack, () => um.redo()),
    stop: () => um.stopCapturing(),
    destroy: () => um.destroy(),
  };
}
