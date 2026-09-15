import Link from 'next/link'

export default function Home() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen flex flex-col font-sans text-gray-900 dark:text-gray-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">LightShot Clone</span>
          </Link>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-semibold leading-6 hover:text-blue-600 transition-colors pt-2">Log in</Link>
          <Link href="/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors">Sign up</Link>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-20 sm:py-32 lg:py-40">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                The fastest way to share your screen.
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
                Secure, fast, and fully under your control. Take screenshots with a single hotkey, upload instantly, and get a shareable link copied to your clipboard.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                {/* Download Button */}
                <a
                  href="#download"
                  className="rounded-full bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all flex items-center gap-2 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download for Windows
                </a>
                <Link href="/dashboard" className="text-sm font-semibold leading-6 hover:text-blue-600 transition-colors">
                  Go to Dashboard <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features / Packages Section */}
        <div id="pricing" className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl sm:text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose your retention plan</h2>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
                We believe in privacy and cleanliness. Your screenshots are automatically deleted based on your plan. No digital clutter.
              </p>
            </div>
            
            <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 lg:max-w-4xl lg:grid-cols-3 lg:gap-8">
              
              {/* Anonymous Tier */}
              <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-gray-800 p-8 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 sm:p-10">
                <div>
                  <h3 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Anonymous</h3>
                  <div className="mt-4 flex items-baseline gap-x-2">
                    <span className="text-5xl font-bold tracking-tight">Free</span>
                  </div>
                  <p className="mt-6 text-base leading-7 text-gray-600 dark:text-gray-400">No account required. Quick and simple sharing.</p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> 7 Days Retention</li>
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> Standard Quality</li>
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> Desktop App Support</li>
                  </ul>
                </div>
                <Link href="/login" className="mt-8 block rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">Start Uploading</Link>
              </div>

              {/* Logged In (Free) Tier */}
              <div className="flex flex-col justify-between rounded-3xl bg-blue-600 p-8 shadow-xl ring-1 ring-blue-600 sm:p-10 transform lg:-translate-y-4">
                <div>
                  <h3 className="text-base font-semibold leading-7 text-blue-100">Registered (Free)</h3>
                  <div className="mt-4 flex items-baseline gap-x-2">
                    <span className="text-5xl font-bold tracking-tight text-white">Free</span>
                  </div>
                  <p className="mt-6 text-base leading-7 text-blue-100">For regular users who want more control.</p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-blue-100">
                    <li className="flex gap-x-3"><span className="text-white">✓</span> 14 Days Retention</li>
                    <li className="flex gap-x-3"><span className="text-white">✓</span> Manage & Delete via Dashboard</li>
                    <li className="flex gap-x-3"><span className="text-white">✓</span> History Log</li>
                  </ul>
                </div>
                <Link href="/login" className="mt-8 block rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors shadow-sm">Create Account</Link>
              </div>

              {/* Pro / Unlimited Tier */}
              <div className="flex flex-col justify-between rounded-3xl bg-white dark:bg-gray-800 p-8 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 sm:p-10">
                <div>
                  <h3 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Pro / Unlimited</h3>
                  <div className="mt-4 flex items-baseline gap-x-2">
                    <span className="text-5xl font-bold tracking-tight">$9</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                  <p className="mt-6 text-base leading-7 text-gray-600 dark:text-gray-400">For power users and professionals.</p>
                  <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> 30 Days or Unlimited Retention</li>
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> High-Res Uploads</li>
                    <li className="flex gap-x-3"><span className="text-indigo-600 dark:text-indigo-400">✓</span> Priority Support</li>
                  </ul>
                </div>
                <button disabled className="mt-8 block w-full rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 opacity-50 cursor-not-allowed">Coming Soon</button>
              </div>

            </div>
          </div>
        </div>

        {/* Setup / Download Section */}
        <div id="download" className="py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Start sharing in seconds</h2>
              <p className="text-lg leading-8 text-gray-600 dark:text-gray-400 mb-10">
                Download the desktop application, press <kbd className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border dark:border-gray-700 text-sm">Ctrl + Shift + S</kbd> to capture your screen, and the link will be automatically copied to your clipboard.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Windows Desktop App</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-md text-center">Currently in development. The source code is available in the /desktop directory for local compilation.</p>
                <button disabled className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm opacity-50 cursor-not-allowed">
                  v1.0.0 (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-900 mt-auto">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} LightShot Clone. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
