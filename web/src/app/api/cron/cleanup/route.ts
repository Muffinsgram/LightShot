import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Validate Vercel Cron Secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // We only enforce secret if it's set in env (e.g. production)
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  try {
    // Find all expired screenshots
    const { data: expiredScreenshots, error: fetchError } = await supabase
      .from('screenshots')
      .select('id, storage_path')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Failed to fetch expired screenshots:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch expired records' }, { status: 500 });
    }

    if (!expiredScreenshots || expiredScreenshots.length === 0) {
      return NextResponse.json({ message: 'No expired screenshots to delete' });
    }

    // Process deletions
    const storagePaths = expiredScreenshots.map(s => s.storage_path);
    const ids = expiredScreenshots.map(s => s.id);

    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('screenshots')
      .remove(storagePaths);

    if (storageError) {
      console.error('Failed to delete files from storage:', storageError);
      // We continue to delete from DB even if some storage deletes fail, 
      // or we can halt depending on preference. Idempotency is good.
    }

    // 2. Delete from database
    const { error: dbError } = await supabase
      .from('screenshots')
      .delete()
      .in('id', ids);

    if (dbError) {
      console.error('Failed to delete records from DB:', dbError);
      return NextResponse.json({ error: 'Failed to delete from database' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: ids.length 
    });

  } catch (err) {
    console.error('Unexpected error in cleanup cron:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
