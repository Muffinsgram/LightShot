import { getCurrentWindow } from '@tauri-apps/api/window';
import OverlayApp from './OverlayApp';
import MainApp from './MainApp';

export default function App() {
  const win = getCurrentWindow();
  
  if (win.label === 'overlay') {
    return <OverlayApp />;
  }
  
  return <MainApp />;
}
