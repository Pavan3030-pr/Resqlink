import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/button'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI error', error, info.componentStack) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">The page hit an unexpected error. Your data is safe. Reload to continue.</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>Reload</Button>
      </div>
    )
  }
}
