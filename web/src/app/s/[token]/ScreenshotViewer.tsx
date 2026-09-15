'use client'

import { useState } from 'react'
import { verifyScreenshotPassword, updateScreenshotSettings } from './actions'
import { deleteScreenshot } from '../../dashboard/actions'

export function ScreenshotViewer({ 
  token, 
  initialSignedUrl, 
  hasPassword, 
  screenshotId,
  storagePath,
  isOwner 
}: { 
  token: string, 
  initialSignedUrl: string | null, 
  hasPassword: boolean,
  screenshotId: string,
  storagePath: string,
  isOwner: boolean
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  // Settings state
  const [newPassword, setNewPassword] = useState('')
  const [showSettings, setShowSettings] = useState(false)

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

  async function handleUpdateSettings(e: React.FormEvent) {
      e.preventDefault()
      // We can add simple UI for this, let's say they just type password.
      // Expiration time logic is handled below.
  }

  async function setExpiration(hours: number | null) {
      const res = await updateScreenshotSettings(screenshotId, token, { expires_in_hours: hours })
      if (res.error) alert(res.error)
      else alert('Expiration updated!')
  }

  async function setPass() {
      const res = await updateScreenshotSettings(screenshotId, token, { password: newPassword })
      if (res.error) alert(res.error)
      else {
          alert('Password updated!')
          setNewPassword('')
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

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full flex justify-between gap-4 max-w-5xl items-center">
        {isOwner && (
          <button onClick={() => setShowSettings(!showSettings)} className="text-sm text-gray-400 hover:text-white transition-colors">
            ⚙️ Manage Screenshot
          </button>
        )}
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
                alert("Image URL copied!")
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
    </div>
  )
}
