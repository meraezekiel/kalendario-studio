'use client';

import Drawer from './Drawer/implementation/Drawer';
import ExportBox from './ExportBox/implementation/ExportBox';
import Inspector from './Inspector/implementation/Inspector';
import PrintArea from './PrintArea/implementation/PrintArea';
import Stage from './Stage/implementation/Stage';
import Toast from './Toast/implementation/Toast';
import ThanksNote from './ThanksNote/implementation/ThanksNote';
import ToolRail from './ToolRail/implementation/ToolRail';
import TopBar from './TopBar/implementation/TopBar';
import { useStudioHandler } from './useStudioHandler';

/** The calendar editor: top bar, tool rail + drawer, canvas, inspector. */
export default function Studio() {
  const { ready } = useStudioHandler();
  if (!ready) return <div className="boot">Loading Kalendaryo Studio…</div>;
  return (
    <>
      <div className="app">
        <TopBar />
        <ToolRail />
        <Drawer />
        <Stage />
        <Inspector />
      </div>
      <PrintArea />
      <ExportBox />
      <Toast />
      <ThanksNote />
    </>
  );
}
