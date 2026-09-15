import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DeleteButton } from './DeleteButton'
import { Camera, Image as ImageIcon, LogOut, Clock, Link as LinkIcon } from 'lucide-react'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: screenshots } = await supabase
    .from('screenshots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('api_key')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Camera size={18} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <form action="/login" method="post">
              <button
                type="submit"
                formAction={async () => {
                  "use server"
                  const supabase = await createClient()
                  await supabase.auth.signOut()
                  redirect('/')
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Log out"
              >
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Your Screenshots</h2>
          <p className="text-gray-500 mt-1">Manage and view all your uploaded captures.</p>
        </div>

        {/* API Key Section */}
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    🔑 Masaüstü Erişim Anahtarı (Desktop Token)
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Bu anahtarı kopyalayıp masaüstü uygulamasındaki "Erişim Anahtarı" bölümüne yapıştır. 
                    Böylece yüklediğin tüm SS'ler otomatik olarak bu panele düşer!
                </p>
            </div>
            {profile?.api_key ? (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <code className="text-sm font-mono text-gray-700 dark:text-gray-300 select-all px-2">
                        {profile.api_key}
                    </code>
                </div>
            ) : (
                <p className="text-sm text-gray-500">Profil anahtarı yüklenemedi.</p>
            )}
        </div>

        {screenshots?.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No screenshots yet</h3>
            <p className="mt-1 text-gray-500">Capture your screen using the desktop app to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {screenshots?.map((screenshot) => (
              <div key={screenshot.id} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 group hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden flex items-center justify-center">
                   {/* We don't render the actual image here to save bandwidth, or we could render a low-res thumbnail if we generated one. */}
                   <ImageIcon size={48} className="text-gray-300 dark:text-gray-700" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <a href={`/s/${screenshot.public_token}`} target="_blank" className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors">
                        View
                      </a>
                   </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Clock size={14} />
                    {new Date(screenshot.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                    Expires: <strong className="text-gray-900 dark:text-gray-200">{screenshot.expires_at ? new Date(screenshot.expires_at).toLocaleDateString() : 'Never'}</strong>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500 truncate w-32">
                      {screenshot.public_token}
                    </div>
                    <DeleteButton id={screenshot.id} storagePath={screenshot.storage_path} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
