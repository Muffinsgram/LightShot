'use client'

import { useState } from 'react'
import { verifyScreenshotPassword, updateScreenshotSettings, updateScreenshotImage } from './actions'
import { deleteScreenshot } from '../../dashboard/actions'
import { CanvasEditor } from './CanvasEditor'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export function ScreenshotViewer({ 
  token, 
  initialSignedUrl, 
  hasPassword, 
  screenshotId,
  storagePath,
  isOwner,
  viewsCount,
  initialDescription
}: { 
  token: string, 
  initialSignedUrl: string | null, 
  hasPassword: boolean,
  screenshotId: string,
  storagePath: string,
  isOwner?: boolean,
  viewsCount: number,
  initialDescription?: string | null
}) {
  const router = useRouter()
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  // Settings state
  const [newPassword, setNewPassword] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [description, setDescription] = useState(initialDescription || '')
  const [isEditing, setIsEditing] = useState(false)

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await verifyScreenshotPassword(token, password)
    if (res.error) {
      setError(res.error)
    } else if (res.signedUrl) {
      setSignedUrl(res.signedUrl)
    }
  }

  async function setExpiration(hours: number) {
      const promise = updateScreenshotSettings(screenshotId, token, { expires_in_hours: hours })
      toast.promise(promise, {
          loading: 'Updating expiration...',
          success: 'Expiration updated!',
          error: 'Failed to update expiration'
      })
      const res = await promise
      if (!res.error) router.refresh()
  }

  async function setPass() {
      const promise = updateScreenshotSettings(screenshotId, token, { password: newPassword })
      toast.promise(promise, {
          loading: 'Updating password...',
          success: 'Password updated!',
          error: 'Failed to update password'
      })
      const res = await promise
      if (!res.error) setNewPassword('')
  }

  async function handleSaveEditedImage(blob: Blob) {
      const formData = new FormData()
      formData.append('file', blob, 'edited.png')
      const promise = updateScreenshotImage(storagePath, formData)
      toast.promise(promise, {
          loading: 'Saving image...',
          success: 'Image updated successfully!',
          error: 'Failed to update image'
      })
      const res = await promise
      if (!res.error) {
          setIsEditing(false)
          setSignedUrl(signedUrl + '&t=' + Date.now())
          router.refresh()
      }
  }

  if (hasPassword && !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Password Protected</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">This screenshot requires a password to view.</p>
        <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
          <input 
            type="password" 
            placeholder="Enter password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-md transition-colors">
            Unlock
          </button>
        </form>
      </div>
    )
  }

  if (isEditing && signedUrl) {
      return <CanvasEditor imageUrl={signedUrl} onSave={handleSaveEditedImage} onCancel={() => setIsEditing(false)} />
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full flex justify-between gap-4 max-w-5xl items-center flex-wrap">
        <div className="flex gap-4 items-center">
            {isOwner && (
              <>
                <button onClick={() => setShowSettings(!showSettings)} className="text-sm text-gray-400 hover:text-white transition-colors">
                    ⚙️ Manage Screenshot
                </button>
                <button onClick={() => setIsEditing(true)} className="text-sm text-gray-400 hover:text-white transition-colors">
                    ✏️ Web Editor
                </button>
              </>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                {viewsCount} views
            </div>
        </div>
        <div className="flex gap-4 ml-auto">
          <a
            href={signedUrl!}
            download={`screenshot-${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-700"
          >
            Download
          </a>
          <button 
             onClick={() => {
                navigator.clipboard.writeText(signedUrl!)
                toast.success("Image URL copied!")
             }}
             className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-700"
          >
            Copy Image Link
          </button>
        </div>
      </div>

      {showSettings && isOwner && (
          <div className="w-full max-w-5xl bg-gray-800 border border-gray-700 p-6 rounded-xl flex flex-col gap-4 mb-4">
              <h3 className="text-lg font-bold text-white">Owner Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Change Expiration Time:</p>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setExpiration(1)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">1 Hour</button>
                        <button onClick={() => setExpiration(24)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">1 Day</button>
                        <button onClick={() => setExpiration(24 * 7)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">1 Week</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-2">Set/Change Password (leave blank to remove):</p>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password" 
                            className="flex-1 px-3 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white"
                        />
                        <button onClick={setPass} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white">Save</button>
                    </div>
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Description (Notes for viewers):</p>
                <div className="flex flex-col gap-2">
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Add a description or note..." 
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white min-h-[80px]"
                    />
                    <button onClick={async () => {
                        const promise = updateScreenshotSettings(screenshotId, token, { description })
                        toast.promise(promise, {
                            loading: 'Saving description...',
                            success: 'Description updated!',
                            error: 'Failed to update description'
                        })
                        const res = await promise
                        if (!res.error) router.refresh()
                    }} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white self-end">
                        Save Description
                    </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
                  <button 
                    onClick={async () => {
                        if(confirm('Delete this screenshot permanently?')) {
                            await deleteScreenshot(screenshotId, storagePath)
                            window.location.href = '/dashboard'
                        }
                    }} 
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm text-white font-medium"
                  >
                      Delete Screenshot
                  </button>
              </div>
          </div>
      )}
      
      <div className="relative w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black flex justify-center items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl!}
          alt="Screenshot"
          className="object-contain max-h-[80vh] w-auto h-auto"
        />
      </div>

      {description && (
        <div className="w-full max-w-5xl bg-gray-800 border border-gray-700 p-6 rounded-xl mt-4 text-gray-200 whitespace-pre-wrap">
          {description}
        </div>
      )}
    </div>
  )
}
