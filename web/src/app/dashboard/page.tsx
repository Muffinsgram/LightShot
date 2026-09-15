import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '../login/actions'
import { DeleteButton } from './DeleteButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch user's screenshots
  const { data: screenshots, error } = await supabase
    .from('screenshots')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Screenshots</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Logged in as {user.email}</p>
          </div>
          <form action={logout}>
            <button className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
              Log out
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screenshots?.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <p className="text-gray-500 dark:text-gray-400">No screenshots found.</p>
            </div>
          ) : (
            screenshots?.map((screenshot) => (
              <div key={screenshot.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Created: {new Date(screenshot.created_at).toLocaleDateString()}</span>
                    <span>Expires: {screenshot.expires_at ? new Date(screenshot.expires_at).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between gap-2">
                  <a
                    href={`/s/${screenshot.public_token}`}
                    target="_blank"
                    className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                  >
                    Open
                  </a>
                  <DeleteButton id={screenshot.id} storagePath={screenshot.storage_path} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
