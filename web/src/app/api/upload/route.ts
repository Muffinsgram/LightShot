import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function generateSecureToken(length = 12) {
  return crypto.randomBytes(length).toString('base64url').substring(0, length);
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // Check authorization header first (for desktop app)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const publicToken = generateSecureToken(16);
    const fileExt = file.name.split('.').pop() || 'png';
    
    // Default expiration (anonymous) = 7 days
    let expiresAt: Date | null = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Determine path based on user or anonymous
    const userIdFolder = user ? user.id : 'anonymous';
    const storagePath = `${userIdFolder}/${publicToken}.${fileExt}`;

    // If user is logged in, check their tier
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tier')
            .eq('user_id', user.id)
            .single();
            
        const tier = profile?.tier || 'free';
        
        if (tier === 'unlimited') {
            expiresAt = null; // Never expires
        } else if (tier === 'pro') {
            expiresAt.setDate(expiresAt.getDate() - 7 + 30); // 30 days
        } else {
            expiresAt.setDate(expiresAt.getDate() - 7 + 14); // 14 days for free logged-in users
        }
    }

    // Use service role client for storage (has full access to create buckets & upload)
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ensure the bucket exists
    const { data: buckets } = await adminSupabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.id === 'screenshots');
    if (!bucketExists) {
      await adminSupabase.storage.createBucket('screenshots', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      });
    }

    // Upload to storage using admin client
    const { error: storageError } = await adminSupabase.storage
      .from('screenshots')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Insert metadata (use admin client to bypass RLS)
    const { error: dbError } = await adminSupabase
      .from('screenshots')
      .insert({
        user_id: user ? user.id : null,
        storage_path: storagePath,
        public_token: publicToken,
        file_size: file.size,
        mime_type: file.type,
        expires_at: expiresAt ? expiresAt.toISOString() : null
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Attempt rollback
      await adminSupabase.storage.from('screenshots').remove([storagePath]);
      return NextResponse.json({ error: 'Upload failed to save metadata' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      success: true,
      url: `${appUrl}/s/${publicToken}`,
      token: publicToken
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
