import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from '@tauri-apps/plugin-global-shortcut';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';

// Icons as SVG components for better styling
const PenIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const SaveIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const CloudIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [token, setToken] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ef4444"); // Default red
  const lineWidth = 3;
  
  useEffect(() => {
    async function setupShortcut() {
      try {
        await register('CommandOrControl+Shift+S', async (event: any) => {
          if (event.state === 'Pressed') {
            await takeScreenshot();
          }
        });
      } catch (err) {
        console.error("Failed to register shortcut", err);
      }
    }
    setupShortcut();
  }, []);

  useEffect(() => {
    if (screenshot && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = window.innerWidth - 120;
        const maxHeight = window.innerHeight - 120;
        
        // Calculate scale to fit within the viewport
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const scale = Math.min(1, Math.min(scaleX, scaleY));
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = screenshot;
      setUploadedUrl(null);
    }
  }, [screenshot]);

  async function takeScreenshot() {
    try {
      const base64 = await invoke<string>("capture_screen");
      setScreenshot(`data:image/png;base64,${base64}`);
    } catch (error) {
      console.error("Capture failed:", error);
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      ctx?.closePath();
      setIsDrawing(false);
    }
  };

  const handleSaveLocally = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `screenshot-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  async function uploadScreenshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'screenshot.png');

      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadedUrl(data.url);
        await writeText(data.url);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  // --- Styles ---
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
      
      {/* Top Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '1rem', alignItems: 'center', background: theme.surface }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, background: 'linear-gradient(to right, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          LightShot Clone
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
          onClick={takeScreenshot} 
          style={{ padding: '0.5rem 1rem', background: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'background 0.2s' }}
          onMouseOver={e => (e.currentTarget.style.background = theme.primaryHover)}
          onMouseOut={e => (e.currentTarget.style.background = theme.primary)}
        >
          Capture Screen
        </button>
      </div>

      {/* Main Content Area */}
      {screenshot ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1.5rem', gap: '1.5rem', justifyContent: 'center' }}>
          
          {/* Canvas Wrapper */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <canvas 
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ cursor: 'crosshair', background: '#000', display: 'block' }}
            />
          </div>

          {/* Floating Right Toolbar */}
          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', background: theme.surface, padding: '1rem 0.5rem', borderRadius: '12px', border: `1px solid ${theme.border}`, height: 'fit-content', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            
            <div style={{ color: theme.textMuted, marginBottom: '0.5rem' }} title="Draw">
              <PenIcon />
            </div>

            {/* Color Picker */}
            <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${theme.border}` }}>
              <input 
                  type="color" 
                  value={color} 
                  onChange={e => setColor(e.target.value)} 
                  title="Choose Color"
                  style={{ position: 'absolute', top: '-10px', left: '-10px', width: '56px', height: '56px', padding: 0, border: 'none', cursor: 'pointer' }}
              />
            </div>
            
            <div style={{ width: '100%', height: '1px', background: theme.border, margin: '0.5rem 0' }} />

            {/* Save Locally */}
            <button 
                onClick={handleSaveLocally}
                title="Save to Computer"
                style={{ width: '40px', height: '40px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.background = theme.surfaceHover)}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
                <SaveIcon />
            </button>

            {/* Upload */}
            <button 
              onClick={uploadScreenshot}
              disabled={isUploading}
              title="Upload & Copy Link"
              style={{ width: '40px', height: '40px', background: theme.success, border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <CloudIcon />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, gap: '1rem' }}>
            <div style={{ padding: '2rem', background: theme.surface, borderRadius: '12px', border: `1px dashed ${theme.border}`, textAlign: 'center' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Ready to capture</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Press <kbd style={{ background: theme.bg, padding: '0.2rem 0.4rem', borderRadius: '4px', border: `1px solid ${theme.border}` }}>Ctrl + Shift + S</kbd> to start.</p>
            </div>
        </div>
      )}

      {/* Success Notification */}
      {uploadedUrl && (
          <div style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '320px',
              animation: 'slideIn 0.3s ease-out'
          }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.success, fontWeight: 600 }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Upload Successful!
                  </div>
                  <button onClick={() => setUploadedUrl(null)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
              
              <div style={{ background: theme.bg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.text, wordBreak: 'break-all' }}>
                {uploadedUrl}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openUrl(uploadedUrl)} style={{ flex: 1, padding: '10px', background: theme.primary, border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
                      Open in Browser
                  </button>
                  <button onClick={async () => { await writeText(uploadedUrl); }} style={{ flex: 1, padding: '10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
                      Copy Link
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
