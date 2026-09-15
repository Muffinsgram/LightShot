'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteScreenshot(id: string, storagePath: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Double check authorization by RLS implicitly, 
  // but let's verify ownership anyway before deleting from storage
  const { data: screenshot, error: fetchError } = await supabase
    .from('screenshots')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !screenshot || screenshot.user_id !== user.id) {
    return { error: 'Not found or unauthorized' }
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('screenshots')
    .remove([storagePath])

  if (storageError) {
    console.error('Failed to delete from storage:', storageError)
    // We can continue, maybe it's already deleted
  }

  // Delete from db
  const { error: dbError } = await supabase
    .from('screenshots')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Failed to delete from db:', dbError)
    return { error: 'Failed to delete record' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
