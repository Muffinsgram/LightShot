'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function verifyScreenshotPassword(token: string, passwordAttempt: string) {
  const supabase = createAdminClient()
  
  const { data: screenshot } = await supabase
    .from('screenshots')
    .select('password_hash, storage_path')
    .eq('public_token', token)
    .single()

  if (!screenshot) return { error: 'Not found' }
  
  if (screenshot.password_hash !== hashPassword(passwordAttempt)) {
    return { error: 'Incorrect password' }
  }

  // Generate signed URL
  const { data, error } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(screenshot.storage_path, 3600)

  if (error || !data) return { error: 'Could not generate URL' }

  return { signedUrl: data.signedUrl }
}

export async function updateScreenshotSettings(id: string, token: string, updates: { expires_in_hours?: number | null, password?: string | null, description?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check ownership
  const { data: screenshot } = await supabase
    .from('screenshots')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!screenshot || screenshot.user_id !== user.id) return { error: 'Unauthorized' }

  const payload: any = {}
  
  if (updates.expires_in_hours !== undefined) {
      if (updates.expires_in_hours === null) {
          payload.expires_at = null
      } else {
          const expiresAt = new Date()
          expiresAt.setHours(expiresAt.getHours() + updates.expires_in_hours)
          payload.expires_at = expiresAt.toISOString()
      }
  }

  if (updates.password !== undefined) {
      if (updates.password === null || updates.password === '') {
          payload.password_hash = null
      } else {
          payload.password_hash = hashPassword(updates.password)
      }
  }
  
  if (updates.description !== undefined) {
      payload.description = updates.description
  }

  const { error } = await supabase.from('screenshots').update(payload).eq('id', id)
  
  if (error) return { error: error.message }
  
  revalidatePath(`/s/${token}`)
  return { success: true }
}
  
export async function updateScreenshotImage(storagePath: string, formData: FormData) {  
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: 'Unauthorized' }; const file = formData.get('file') as File; if (!file) return { error: 'No file' }; const supabaseAdmin = createAdminClient(); const { error } = await supabaseAdmin.storage.from('screenshots').upload(storagePath, file, { upsert: true, cacheControl: '0' }); if (error) return { error: error.message }; return { success: true }; } 
