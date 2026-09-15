import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { register } from '@tauri-apps/plugin-global-shortcut';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';

const PenIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const SaveIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const CloudIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [token, setToken] = useState('');

  // Cropping State
  const [hasCropped, setHasCropped] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Layout scale (to map mouse to actual image pixels)
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const setup = async () => {
      try {
        await register('Super+Shift+K', async (e: any) => { if (e.state === 'Pressed') takeScreenshot(false); });
        await register('CommandOrControl+Shift+K', async (e: any) => { if (e.state === 'Pressed') takeScreenshot(false); });
      } catch (e) { console.error(e); }

      await listen('trigger-crop-screenshot', () => takeScreenshot(false));
      await listen('trigger-full-screenshot', () => takeScreenshot(true));
    };
    setup();
  }, []);

  const takeScreenshot = async (skipCrop: boolean) => {
    try {
      setScreenshot(null);
      setHasCropped(false);
      setUploadedUrl(null);
      
      const base64: string = await invoke('capture_screen');
      const dataUrl = `data:image/png;base64,${base64}`;
      setScreenshot(dataUrl);

      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        setHasCropped(skipCrop);
        renderInitial(img);
        const win = getCurrentWindow();
        win.show();
        win.setFocus();
      };
      img.src = dataUrl;
    } catch (e: any) {
      alert("Error taking screenshot: " + String(e));
    }
  };

  const renderInitial = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !wrapperRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale down if image is too large for window
    const maxWidth = wrapperRef.current.clientWidth;
    const maxHeight = wrapperRef.current.clientHeight;
    let s = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    setScale(s);

    canvas.width = img.width * s;
    canvas.height = img.height * s;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!baseImage) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!hasCropped) {
      setIsCropping(true);
      setCropStart({ x, y });
      setCropRect({ x, y, w: 0, h: 0 });
    } else {
      setIsDrawing(true);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!baseImage || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isCropping) {
      const x = Math.min(currentX, cropStart.x);
      const y = Math.min(currentY, cropStart.y);
      const w = Math.abs(currentX - cropStart.x);
      const h = Math.abs(currentY - cropStart.y);
      setCropRect({ x, y, w, h });

      // Re-render base and overlay
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(baseImage, 0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.clearRect(x, y, w, h);
      ctx.drawImage(
        baseImage,
        x / scale, y / scale, w / scale, h / scale,
        x, y, w, h
      );
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

    } else if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (isCropping && canvasRef.current) {
      setIsCropping(false);
      if (cropRect.w > 10 && cropRect.h > 10) {
        // Extract cropped area to new base image
        const c = document.createElement('canvas');
        c.width = cropRect.w;
        c.height = cropRect.h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvasRef.current, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
          const newImg = new Image();
          newImg.onload = () => {
            setBaseImage(newImg);
            setHasCropped(true);
            renderInitial(newImg);
          };
          newImg.src = c.toDataURL();
        }
      } else {
        setCropRect({x:0, y:0, w:0, h:0});
        renderInitial(baseImage!);
      }
    } else if (isDrawing) {
      setIsDrawing(false);
    }
  };

  // --- Actions ---
  const handleSaveLocally = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FastShot_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const uploadScreenshot = async () => {
    if (!canvasRef.current) return;
    setIsUploading(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
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
    }, 'image/png');
  };

  const theme = {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    success: '#10b981',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: theme.bg, color: theme.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '1rem', alignItems: 'center', background: theme.surface }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, background: 'linear-gradient(to right, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          FastShot
        </h2>
        
        <div style={{ flex: 1 }} />
        
        <input 
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste Access Token (Optional)"
          style={{ width: '250px', padding: '0.5rem 1rem', background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '14px', outline: 'none' }}
        />
        <button 
          onClick={() => takeScreenshot(false)} 
          style={{ padding: '0.5rem 1rem', background: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          Capture Screen
        </button>
      </div>

      {screenshot ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1.5rem', gap: '1.5rem', justifyContent: 'center' }}>
          
          <div ref={wrapperRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <canvas 
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: hasCropped ? 'crosshair' : 'crosshair', background: '#000', display: 'block', maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>

          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', background: theme.surface, padding: '1rem 0.5rem', borderRadius: '12px', border: `1px solid ${theme.border}`, height: 'fit-content' }}>
            {hasCropped ? (
               <>
                <div style={{ color: theme.textMuted, marginBottom: '0.5rem' }} title="Draw"><PenIcon /></div>
                <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${theme.border}` }}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '56px', height: '56px', padding: 0, border: 'none', cursor: 'pointer' }} />
                </div>
                <div style={{ width: '100%', height: '1px', background: theme.border, margin: '0.5rem 0' }} />
               </>
            ) : (
                <div style={{ color: theme.textMuted, fontSize: '10px', textAlign: 'center' }}>Crop First</div>
            )}

            <button onClick={handleSaveLocally} disabled={!hasCropped} style={{ width: '40px', height: '40px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: hasCropped ? 'pointer' : 'not-allowed', color: hasCropped ? theme.text : theme.border }}>
                <SaveIcon />
            </button>
            <button onClick={uploadScreenshot} disabled={isUploading || !hasCropped} style={{ width: '40px', height: '40px', background: hasCropped ? theme.success : theme.border, border: 'none', borderRadius: '8px', cursor: hasCropped ? 'pointer' : 'not-allowed', color: 'white' }}>
              <CloudIcon />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, gap: '1rem' }}>
            <div style={{ padding: '2rem', background: theme.surface, borderRadius: '12px', border: `1px dashed ${theme.border}`, textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Ready to capture</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Press <kbd style={{ background: theme.bg, padding: '0.2rem 0.4rem', borderRadius: '4px', border: `1px solid ${theme.border}` }}>Win + Shift + K</kbd> to start.</p>
            </div>
        </div>
      )}

      {uploadedUrl && (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: theme.success, fontWeight: 600 }}>Upload Successful!</div>
                  <button onClick={() => setUploadedUrl(null)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ background: theme.bg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.text, wordBreak: 'break-all' }}>{uploadedUrl}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openUrl(uploadedUrl)} style={{ flex: 1, padding: '10px', background: theme.primary, border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>Open in Browser</button>
                  <button onClick={async () => await writeText(uploadedUrl)} style={{ flex: 1, padding: '10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, cursor: 'pointer' }}>Copy Link</button>
              </div>
          </div>
      )}
    </div>
  );
}
