import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { load } from '@tauri-apps/plugin-store';

// ============ i18n ============
const translations = {
  tr: {
    appName: 'FastShot',
    ready: '📸 Hazır!',
    shortcutHint: 'veya yukarıdaki butonları kullan',
    cropBtn: '✂️ Alan Seç',
    fullBtn: '📷 Tam Ekran',
    tokenPlaceholder: 'Erişim Anahtarı (Opsiyonel)',
    dragHint: 'Alan seçmek için fareyle sürükle',
    confirm: '✓ Onayla (Enter)',
    draw: 'Çiz',
    save: 'Bilgisayara Kaydet',
    copy: 'Kopyala',
    upload: 'Yükle & Link Al',
    uploadSuccess: '✅ Yükleme Başarılı!',
    openBrowser: 'Tarayıcıda Aç',
    copyLink: 'Link Kopyala',
    copied: '✅ Kopyalandı!',
    savedAs: '✅ Kaydedildi!',
    trayShow: 'Ana Pencereyi Göster',
    trayCrop: 'Alan Seçerek SS Al',
    trayFull: 'Tam Ekran SS Al',
    trayQuit: 'Kapat',
  },
  en: {
    appName: 'FastShot',
    ready: '📸 Ready!',
    shortcutHint: 'or use the buttons above',
    cropBtn: '✂️ Crop Area',
    fullBtn: '📷 Full Screen',
    tokenPlaceholder: 'Access Token (Optional)',
    dragHint: 'Drag to select an area',
    confirm: '✓ Confirm (Enter)',
    draw: 'Draw',
    save: 'Save to Computer',
    copy: 'Copy',
    upload: 'Upload & Get Link',
    uploadSuccess: '✅ Upload Successful!',
    openBrowser: 'Open in Browser',
    copyLink: 'Copy Link',
    copied: '✅ Copied!',
    savedAs: '✅ Saved!',
    trayShow: 'Show Window',
    trayCrop: 'Capture Area',
    trayFull: 'Full Screen Capture',
    trayQuit: 'Quit',
  }
};

function getLang(): 'tr' | 'en' {
  const lang = navigator.language || 'en';
  return lang.startsWith('tr') ? 'tr' : 'en';
}

// ============ Icons ============
const PenIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const SaveIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>;
const CloudIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
const CopyIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;

type AppMode = 'idle' | 'cropping' | 'editing';

export default function App() {
  const t = translations[getLang()];
  const [mode, setMode] = useState<AppMode>('idle');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const editWrapperRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    const setup = async () => {
      // Load store
      try {
        const store = await load('settings.json', { autoSave: false });
        const savedToken = await store.get<{ value: string }>('api_token');
        if (savedToken) {
          setToken(savedToken.value);
        }
      } catch (e) {
        console.error('Failed to load store', e);
      }

      await listen<string>('screenshot-taken', async (event) => {
        const dataUrl = `data:image/png;base64,${event.payload}`;
        setScreenshotData(dataUrl);
        setUploadedUrl(null);
        setCropRect({ x: 0, y: 0, w: 0, h: 0 });
        await invoke('enter_crop_mode');
        setMode('cropping');
      });

      await listen('trigger-full-screenshot', async () => {
        try {
          const base64: string = await invoke('capture_screen');
          loadIntoEditor(`data:image/png;base64,${base64}`);
        } catch(e) {}
      });

      const win = getCurrentWindow();
      await win.show();
    };
    setup();
  }, []);

  const handleTokenChange = async (newToken: string) => {
    setToken(newToken);
    try {
      const store = await load('settings.json', { autoSave: false });
      await store.set('api_token', { value: newToken });
      await store.save();
    } catch (e) {
      console.error('Failed to save token', e);
    }
  };

  // Load screenshot into crop canvas
  useEffect(() => {
    if (mode === 'cropping' && screenshotData && cropCanvasRef.current) {
      const img = new Image();
      img.onload = () => {
        cropImageRef.current = img;
        const canvas = cropCanvasRef.current!;
        canvas.width = window.screen.width;
        canvas.height = window.screen.height;
        renderCropCanvas(img, { x: 0, y: 0, w: 0, h: 0 });
      };
      img.src = screenshotData;
    }
  }, [mode, screenshotData]);

  const renderCropCanvas = (img: HTMLImageElement, crop: {x: number, y: number, w: number, h: number}) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (crop.w > 5 && crop.h > 5) {
      ctx.clearRect(crop.x, crop.y, crop.w, crop.h);
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, crop.x, crop.y, crop.w, crop.h);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
    }
  };

  // --- CROP HANDLERS ---
  const onCropMouseDown = (e: React.MouseEvent) => {
    setIsCropping(true);
    setCropStart({ x: e.clientX, y: e.clientY });
    setCropRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const onCropMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !cropImageRef.current) return;
    const x = Math.min(e.clientX, cropStart.x);
    const y = Math.min(e.clientY, cropStart.y);
    const w = Math.abs(e.clientX - cropStart.x);
    const h = Math.abs(e.clientY - cropStart.y);
    const newCrop = { x, y, w, h };
    setCropRect(newCrop);
    renderCropCanvas(cropImageRef.current, newCrop);
  };

  const onCropMouseUp = () => setIsCropping(false);

  const confirmCrop = async () => {
    if (!cropImageRef.current || cropRect.w < 10 || cropRect.h < 10) return;
    const c = document.createElement('canvas');
    c.width = cropRect.w;
    c.height = cropRect.h;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(cropImageRef.current, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
      loadIntoEditor(c.toDataURL('image/png'));
    }
  };

  const cancelCrop = async () => {
    await invoke('exit_crop_mode');
    setMode('idle');
    setScreenshotData(null);
  };

  const loadIntoEditor = async (dataUrl: string) => {
    setCroppedImage(dataUrl);
    setUploadedUrl(null);
    await invoke('exit_crop_mode');
    setMode('editing');
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = editCanvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    }, 100);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (mode === 'cropping') {
        if (e.key === 'Enter') confirmCrop();
        if (e.key === 'Escape') cancelCrop();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, cropRect]);

  // --- DRAW HANDLERS ---
  const onDrawMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      ctx.beginPath();
      ctx.moveTo((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    }
  };

  const onDrawMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      ctx.lineTo((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4 * sx;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const onDrawMouseUp = () => setIsDrawing(false);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (!editCanvasRef.current) return;
    try {
      const filePath = await save({
        defaultPath: `FastShot_${Date.now()}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
      if (!filePath) return;

      const dataUrl = editCanvasRef.current.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      await writeFile(filePath, bytes);
      showToast(t.savedAs);
    } catch (e: any) {
      alert("Save failed: " + (e.message || String(e)));
    }
  };

  const handleCopy = async () => {
    if (!editCanvasRef.current) return;
    editCanvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast(t.copied);
      } catch (e) {
        // Fallback: copy as data URL text
        const dataUrl = editCanvasRef.current!.toDataURL('image/png');
        await writeText(dataUrl);
        showToast(t.copied);
      }
    }, 'image/png');
  };

  const handleUpload = async () => {
    if (!editCanvasRef.current) return;
    setIsUploading(true);
    editCanvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const fd = new FormData();
        fd.append('file', blob, 'screenshot.png');
        const res = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: fd
        });
        
        const data = await res.json();
        
        if (res.ok) { 
            setUploadedUrl(data.url); 
            await writeText(data.url); 
        } else {
            alert("Upload failed: " + (data.error || JSON.stringify(data)));
        }
      } catch (e: any) { 
          alert("Error: " + (e.message || String(e))); 
      } finally { 
          setIsUploading(false); 
      }
    }, 'image/png');
  };

  const startNewCrop = async () => {
    try {
      const base64: string = await invoke('capture_screen');
      const dataUrl = `data:image/png;base64,${base64}`;
      setScreenshotData(dataUrl);
      setUploadedUrl(null);
      setCropRect({ x: 0, y: 0, w: 0, h: 0 });
      await invoke('enter_crop_mode');
      setMode('cropping');
    } catch(e) {}
  };

  const theme = { bg: '#0f172a', surface: '#1e293b', surfaceHover: '#334155', primary: '#3b82f6', success: '#10b981', warning: '#f59e0b', text: '#f8fafc', textMuted: '#94a3b8', border: '#334155' };

  // ========== CROP MODE ==========
  if (mode === 'cropping') {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000', cursor: 'crosshair' }}>
        <canvas ref={cropCanvasRef} onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove} onMouseUp={onCropMouseUp}
          style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />
        {cropRect.w > 10 && cropRect.h > 10 && (
          <div style={{
            position: 'absolute', top: Math.max(8, cropRect.y - 44), left: cropRect.x,
            background: '#1e293b', padding: '8px 14px', borderRadius: '8px', color: 'white',
            fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontFamily: 'system-ui, sans-serif', zIndex: 10
          }}>
            <span style={{ color: '#94a3b8' }}>{cropRect.w} × {cropRect.h}</span>
            <button onClick={confirmCrop} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '5px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
              {t.confirm}
            </button>
            <button onClick={cancelCrop} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        {cropRect.w <= 10 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            color: 'white', fontFamily: 'system-ui, sans-serif', fontSize: '18px', textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            pointerEvents: 'none', opacity: 0.8 }}>
            {t.dragHint}
          </div>
        )}
      </div>
    );
  }

  // ========== EDITOR / IDLE MODE ==========
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: theme.bg, color: theme.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '1rem', alignItems: 'center', background: theme.surface }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, background: 'linear-gradient(to right, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t.appName}
        </h2>
        <div style={{ flex: 1 }} />
        <input type="password" value={token} onChange={(e) => handleTokenChange(e.target.value)} placeholder={t.tokenPlaceholder}
          style={{ width: '220px', padding: '0.5rem 1rem', background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '14px', outline: 'none' }}
        />
        <button onClick={startNewCrop} style={{ padding: '0.5rem 1rem', background: theme.surfaceHover, color: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {t.cropBtn}
        </button>
        <button onClick={async () => { try { const b: string = await invoke('capture_screen'); loadIntoEditor(`data:image/png;base64,${b}`); } catch(e){} }}
          style={{ padding: '0.5rem 1rem', background: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {t.fullBtn}
        </button>
      </div>

      {/* Content */}
      {mode === 'editing' && croppedImage ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1.5rem', gap: '1.5rem', justifyContent: 'center' }}>
          <div ref={editWrapperRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <canvas ref={editCanvasRef} onMouseDown={onDrawMouseDown} onMouseMove={onDrawMouseMove} onMouseUp={onDrawMouseUp} onMouseLeave={onDrawMouseUp}
              style={{ cursor: 'crosshair', background: '#000', display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          {/* Toolbar */}
          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', background: theme.surface, padding: '1rem 0.5rem', borderRadius: '12px', border: `1px solid ${theme.border}`, height: 'fit-content' }}>
            <div style={{ color: theme.textMuted, marginBottom: '0.25rem' }} title={t.draw}><PenIcon /></div>
            <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${theme.border}` }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '56px', height: '56px', padding: 0, border: 'none', cursor: 'pointer' }} />
            </div>
            <div style={{ width: '100%', height: '1px', background: theme.border, margin: '0.25rem 0' }} />
            <button onClick={handleCopy} title={t.copy} style={{ width: '40px', height: '40px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CopyIcon />
            </button>
            <button onClick={handleSave} title={t.save} style={{ width: '40px', height: '40px', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SaveIcon />
            </button>
            <button onClick={handleUpload} disabled={isUploading} title={t.upload} style={{ width: '40px', height: '40px', background: theme.success, border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 0.5 : 1 }}>
              <CloudIcon />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, gap: '1rem' }}>
          <div style={{ padding: '2rem 3rem', background: theme.surface, borderRadius: '12px', border: `1px dashed ${theme.border}`, textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>{t.ready}</p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <kbd style={{ background: theme.bg, padding: '0.2rem 0.5rem', borderRadius: '4px', border: `1px solid ${theme.border}` }}>Print Screen</kbd>
              {' / '}
              <kbd style={{ background: theme.bg, padding: '0.2rem 0.5rem', borderRadius: '4px', border: `1px solid ${theme.border}` }}>Ctrl+Shift+S</kbd>
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: theme.textMuted }}>{t.shortcutHint}</p>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '12px 24px', color: theme.text, fontSize: '14px', fontWeight: 500, boxShadow: '0 10px 25px rgba(0,0,0,0.4)', zIndex: 100 }}>
          {toast}
        </div>
      )}

      {/* Upload success */}
      {uploadedUrl && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', width: '320px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: theme.success, fontWeight: 600 }}>{t.uploadSuccess}</div>
            <button onClick={() => setUploadedUrl(null)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ background: theme.bg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.text, wordBreak: 'break-all' }}>{uploadedUrl}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => openUrl(uploadedUrl)} style={{ flex: 1, padding: '10px', background: theme.primary, border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>{t.openBrowser}</button>
            <button onClick={async () => { await writeText(uploadedUrl); showToast(t.copied); }} style={{ flex: 1, padding: '10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, cursor: 'pointer' }}>{t.copyLink}</button>
          </div>
        </div>
      )}
    </div>
  );
}
