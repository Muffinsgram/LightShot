import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen, emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export default function OverlayApp() {
  const [screenshot, setScreenshot] = useState<HTMLImageElement | null>(null);
  
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const win = getCurrentWindow();
    
    // Hide initially until triggered
    win.hide();

    const setup = async () => {
      await listen('trigger-crop-screenshot', async () => {
        try {
          const base64: string = await invoke('capture_screen');
          const dataUrl = `data:image/png;base64,${base64}`;
          const img = new Image();
          img.onload = async () => {
            setScreenshot(img);
            setCropRect({x:0, y:0, w:0, h:0});
            renderCanvas(img, {x:0, y:0, w:0, h:0});
            await win.show();
            await win.setFocus();
          };
          img.src = dataUrl;
        } catch (e) {
          console.error("Capture error", e);
        }
      });
    };
    setup();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        win.hide();
        setScreenshot(null);
      } else if (e.key === 'Enter' && cropRect.w > 10) {
        confirmCrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropRect]);

  const confirmCrop = async () => {
    if (!canvasRef.current || !screenshot) return;
    const c = document.createElement('canvas');
    c.width = cropRect.w;
    c.height = cropRect.h;
    const ctx = c.getContext('2d');
    if (ctx) {
      // Extract from the ORIGINAL screenshot (not the darkened canvas)
      ctx.drawImage(screenshot, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
      const dataUrl = c.toDataURL('image/png');
      
      // Emit to Main App
      await emit('cropped-image', { dataUrl });
      
      // Hide Overlay
      const win = getCurrentWindow();
      await win.hide();
      setScreenshot(null);
    }
  };

  const renderCanvas = (img: HTMLImageElement, currentCrop: {x:number, y:number, w:number, h:number}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.screen.width;
    canvas.height = window.screen.height;

    // Draw full screenshot
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Darken overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentCrop.w > 0) {
      // Clear the cropped area
      ctx.clearRect(currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h);
      // Draw original image part back
      ctx.drawImage(
        img, 
        currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h,
        currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h
      );
      // Add border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsCropping(true);
    setCropStart({ x: e.clientX, y: e.clientY });
    setCropRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !screenshot) return;
    const x = Math.min(e.clientX, cropStart.x);
    const y = Math.min(e.clientY, cropStart.y);
    const w = Math.abs(e.clientX - cropStart.x);
    const h = Math.abs(e.clientY - cropStart.y);
    const newCrop = { x, y, w, h };
    setCropRect(newCrop);
    renderCanvas(screenshot, newCrop);
  };

  const handleMouseUp = () => {
    setIsCropping(false);
  };

  if (!screenshot) return null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: 'transparent' }}>
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: 'crosshair', display: 'block' }}
      />
      {cropRect.w > 10 && (
          <div style={{
              position: 'absolute',
              top: Math.max(10, cropRect.y - 40),
              left: cropRect.x,
              background: '#1e293b',
              padding: '8px 12px',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              fontFamily: 'sans-serif'
          }}>
              {cropRect.w} x {cropRect.h}
              <button 
                  onClick={confirmCrop}
                  style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                  Onayla (Enter)
              </button>
              <button 
                  onClick={() => { setScreenshot(null); getCurrentWindow().hide(); }}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
              >
                  ✕
              </button>
          </div>
      )}
    </div>
  );
}
