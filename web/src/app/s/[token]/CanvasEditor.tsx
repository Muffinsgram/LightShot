'use client'
import { useState, useRef, useEffect } from 'react'

export function CanvasEditor({ 
  imageUrl, 
  onSave, 
  onCancel 
}: { 
  imageUrl: string, 
  onSave: (blob: Blob) => Promise<void>, 
  onCancel: () => void 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(3)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous" // in case signed URL
    img.onload = () => {
      // Scale down if image is too large for window
      const maxWidth = window.innerWidth - 100
      const maxHeight = window.innerHeight - 200
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
      
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = imageUrl
  }, [imageUrl])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const handleSave = () => {
    if (!canvasRef.current) return
    setIsSaving(true)
    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        await onSave(blob)
      }
      setIsSaving(false)
    }, 'image/png')
  }

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-900 p-6 rounded-xl border border-gray-700 w-full max-w-5xl">
      <div className="flex gap-4 items-center bg-gray-800 p-2 rounded-lg border border-gray-700 w-full">
        <span className="text-white font-medium px-2">Web Editor</span>
        <div className="h-6 w-px bg-gray-600"></div>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" title="Color" />
        <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="bg-gray-700 text-white border-none rounded p-1 text-sm">
          <option value={1}>Thin</option>
          <option value={3}>Normal</option>
          <option value={6}>Thick</option>
          <option value={10}>Very Thick</option>
        </select>
        
        <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50" disabled={isSaving}>Cancel</button>
            <button onClick={handleSave} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors font-medium flex items-center gap-2" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
      </div>

      <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-black shadow-2xl">
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair block"
        />
      </div>
    </div>
  )
}
