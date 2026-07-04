import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Catches render-time crashes and shows a message instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const isSupabase = /supabase|fetch|url is required/i.test(error.message)

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-content">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isSupabase
              ? 'The app could not reach its backend. If you just deployed, make sure the Supabase environment variables are set.'
              : 'An unexpected error occurred while loading the app.'}
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-surface p-3 text-left text-xs text-danger">
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
