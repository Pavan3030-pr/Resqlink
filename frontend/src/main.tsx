import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import { A11yProvider } from './lib/a11y'
import { installSandboxIfActive } from './lib/sandbox'
import { pingServer } from './lib/serverStatus'
import { AuthProvider } from './lib/auth'
import { I18nProvider } from './lib/i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <A11yProvider>
            <I18nProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </I18nProvider>
          </A11yProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

// Offline-capable app shell (production only; API calls are never intercepted).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* optional enhancement */ }) })
}

installSandboxIfActive()

// Wake a sleeping free-tier server while the page loads, so sign-in is not the first request to wait for it.
void pingServer(10_000)
