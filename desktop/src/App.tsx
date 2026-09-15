import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { register } from '@tauri-apps/plugin-global-shortcut';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';

// Icons
const SaveIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const CloudIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  
  // Cropping State
  const [isCropping, setIsCropping] = useState(false);
  const [hasCropped, setHasCropped] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [token] = useState(''); // Default token if any

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingLayerRef = useRef<HTMLCanvasElement>(null); // To store drawings

  useEffect(() => {
    getCurrentWindow().hide();

    const setupEvents = async () => {
      try {
        await register('Super+Shift+K', async (event: any) => {
          if (event.state === 'Pressed') await takeScreenshot(false);
        });
        await register('CommandOrControl+Shift+K', async (event: any) => {
          if (event.state === 'Pressed') await takeScreenshot(false);
        });
      } catch (e) {
        console.error("Failed to register shortcut", e);
      }

      await listen('trigger-crop-screenshot', () => {
          takeScreenshot(false);
      });
      await listen('trigger-full-screenshot', () => {
          takeScreenshot(true);
      });
    };
    
    setupEvents();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetApp();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const resetApp = async () => {
    setScreenshot(null);
    setBaseImage(null);
    setHasCropped(false);
    setIsCropping(false);
    setCropRect({ x: 0, y: 0, w: 0, h: 0 });
    setUploadedUrl(null);
    
    const win = getCurrentWindow();
    await win.hide();
  };

  const takeScreenshot = async (isFull: boolean) => {
    try {
      resetApp();
      const base64: string = await invoke('capture_screen');
      const dataUrl = `data:image/png;base64,${base64}`;
      setScreenshot(dataUrl);

      const img = new Image();
      img.onload = async () => {
        setBaseImage(img);
        
        const win = getCurrentWindow();
        await win.show();
        await win.setFocus();
        
        // Wait a tiny bit to ensure window is fully visible and rendered
        setTimeout(() => {
            if (isFull) {
                setHasCropped(true);
                const fullRect = { x: 0, y: 0, w: window.screen.width, h: window.screen.height };
                setCropRect(fullRect);
                renderCanvas(img, fullRect, true);
            } else {
                renderCanvas(img, { x:0, y:0, w:0, h:0 }, false);
            }
        }, 50);
      };
      img.src = dataUrl;
      
    } catch (e: any) {
      console.error(e);
      try { await writeText("Error taking screenshot: " + String(e)); } catch(err){}
    }
  };

  const renderCanvas = (img: HTMLImageElement, currentCrop: {x:number, y:number, w:number, h:number}, cropped: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to fullscreen (using screen to avoid 0 dimensions when hidden)
    canvas.width = window.screen.width;
    canvas.height = window.screen.height;

    // Draw full screenshot
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // If cropped or cropping, darken the rest
    if (cropped || currentCrop.w > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear the cropped area
      ctx.clearRect(currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h);
      
      // Draw the original image piece back into the cleared area
      ctx.drawImage(
        img, 
        currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h, // Source
        currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h  // Dest
      );
      
      // Add border to crop area
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(currentCrop.x, currentCrop.y, currentCrop.w, currentCrop.h);
      
      // If we have a drawing layer, draw it over the crop area
      if (drawingLayerRef.current) {
          ctx.drawImage(drawingLayerRef.current, 0, 0);
      }
    }
  };

  // Setup drawing layer
  useEffect(() => {
      if (hasCropped && canvasRef.current) {
          const dl = document.createElement('canvas');
          dl.width = canvasRef.current.width;
          dl.height = canvasRef.current.height;
          drawingLayerRef.current = dl;
      }
  }, [hasCropped]);

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!baseImage) return;

    if (!hasCropped) {
      // Start cropping
      setIsCropping(true);
      setCropStart({ x: e.clientX, y: e.clientY });
      setCropRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    } else {
      // Start drawing ONLY if inside crop area
      if (e.clientX >= cropRect.x && e.clientX <= cropRect.x + cropRect.w &&
          e.clientY >= cropRect.y && e.clientY <= cropRect.y + cropRect.h) {
          setIsDrawing(true);
          const ctx = drawingLayerRef.current?.getContext('2d');
          if (ctx) {
              ctx.beginPath();
              ctx.moveTo(e.clientX, e.clientY);
          }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!baseImage) return;

    if (isCropping) {
      const x = Math.min(e.clientX, cropStart.x);
      const y = Math.min(e.clientY, cropStart.y);
      const w = Math.abs(e.clientX - cropStart.x);
      const h = Math.abs(e.clientY - cropStart.y);
      const newCrop = { x, y, w, h };
      setCropRect(newCrop);
      renderCanvas(baseImage, newCrop, false);
    } else if (isDrawing && drawingLayerRef.current) {
      const ctx = drawingLayerRef.current.getContext('2d');
      if (ctx) {
          ctx.lineTo(e.clientX, e.clientY);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
          // Re-render main canvas to show drawing
          renderCanvas(baseImage, cropRect, true);
      }
    }
  };

  const handleMouseUp = () => {
    if (isCropping) {
      setIsCropping(false);
      // Only confirm crop if area is large enough
      if (cropRect.w > 10 && cropRect.h > 10) {
          setHasCropped(true);
      } else {
          setCropRect({x:0,y:0,w:0,h:0});
          if(baseImage) renderCanvas(baseImage, {x:0,y:0,w:0,h:0}, false);
      }
    } else if (isDrawing) {
      setIsDrawing(false);
    }
  };

  // --- Actions ---
  const extractCroppedBlob = async (): Promise<Blob | null> => {
      const c = document.createElement('canvas');
      c.width = cropRect.w;
      c.height = cropRect.h;
      const ctx = c.getContext('2d');
      if (!ctx || !canvasRef.current) return null;
      
      // Extract from main canvas which contains both image and drawings
      ctx.drawImage(
          canvasRef.current,
          cropRect.x, cropRect.y, cropRect.w, cropRect.h,
          0, 0, cropRect.w, cropRect.h
      );

      return new Promise(resolve => c.toBlob(resolve, 'image/png'));
  };

  const handleSaveLocally = async () => {
    const blob = await extractCroppedBlob();
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FastShot_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    resetApp();
  };

  const uploadScreenshot = async () => {
    const blob = await extractCroppedBlob();
    if (!blob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'screenshot.png');
      
      const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setUploadedUrl(data.url);
        await writeText(data.url);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- UI ---
  const theme = {
    surface: '#1e293b',
    primary: '#3b82f6',
    success: '#10b981',
    text: '#f8fafc',
    border: '#334155',
  };

  if (!screenshot) {
      return null; // App is hidden
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
            cursor: hasCropped ? 'crosshair' : 'crosshair', 
            display: 'block' 
        }}
      />

      {/* Floating Toolbar (Only shows after cropping) */}
      {hasCropped && (
          <div style={{ 
              position: 'absolute', 
              top: Math.max(10, cropRect.y), 
              left: cropRect.x + cropRect.w + 10,
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem', 
              background: theme.surface, 
              padding: '0.5rem', 
              borderRadius: '8px', 
              border: `1px solid ${theme.border}`,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }}>
            <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                title="Choose Color"
                style={{ width: '28px', height: '28px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            />
            
            <div style={{ width: '100%', height: '1px', background: theme.border, margin: '0.25rem 0' }} />

            <button onClick={handleSaveLocally} title="Save Locally" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SaveIcon />
            </button>

            <button onClick={uploadScreenshot} disabled={isUploading} title="Upload & Copy Link" style={{ width: '32px', height: '32px', background: theme.success, border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloudIcon />
            </button>
            <button onClick={resetApp} title="Close" style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                ✕
            </button>
          </div>
      )}

      {/* Success Notification */}
      {uploadedUrl && (
          <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '320px',
          }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: theme.success, fontWeight: 600 }}>
                  Upload Successful!
                  <button onClick={resetApp} style={{ background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { openUrl(uploadedUrl); resetApp(); }} style={{ flex: 1, padding: '8px', background: theme.primary, border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Open</button>
                  <button onClick={async () => { await writeText(uploadedUrl); resetApp(); }} style={{ flex: 1, padding: '8px', background: theme.surface, border: `1px solid ${theme.border}`, color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Copy</button>
              </div>
          </div>
      )}
    </div>
  );
}
