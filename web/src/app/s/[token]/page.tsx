import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { ScreenshotViewer } from './ScreenshotViewer'

export default async function ScreenshotPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params;
  const supabaseAdmin = createAdminClient()
  const supabaseAuth = await createClient()

  // Find metadata
  const { data: screenshot, error } = await supabaseAdmin
    .from('screenshots')
    .select('*')
    .eq('public_token', token)
    .single()

  if (error || !screenshot) {
    return notFound()
  }

  // Check if expired
  if (screenshot.expires_at && new Date(screenshot.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Screenshot Expired</h1>
          <p className="text-gray-500 dark:text-gray-400">
            This screenshot has passed its expiration limit and is no longer available.
          </p>
        </div>
      </div>
    )
  }

  // Check ownership
  const { data: { user } } = await supabaseAuth.auth.getUser()
  const isOwner = user?.id === screenshot.user_id

  const hasPassword = !!screenshot.password_hash
  let signedUrl = null

  // Get signed URL immediately if no password, or if owner (owners bypass password on view)
  if (!hasPassword || isOwner) {
    const { data } = await supabaseAdmin.storage
      .from('screenshots')
      .createSignedUrl(screenshot.storage_path, 3600)
    signedUrl = data?.signedUrl || null
  }

  // Increment view counter securely (doesn't block render)
  if (!isOwner) {
     supabaseAdmin.rpc('increment_view', { screenshot_id: screenshot.id }).then()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      
      <ScreenshotViewer 
        token={token}
        initialSignedUrl={signedUrl}
        hasPassword={hasPassword && !isOwner}
        screenshotId={screenshot.id}
        storagePath={screenshot.storage_path}
        isOwner={isOwner}
        viewsCount={screenshot.views_count || 0}
      />
        
      <div className="text-gray-500 text-sm mt-6">
        Uploaded on {new Date(screenshot.created_at).toLocaleDateString()} &middot; 
        Expires {screenshot.expires_at ? `on ${new Date(screenshot.expires_at).toLocaleDateString()}` : 'Never'}
      </div>
    </div>
  )
}
