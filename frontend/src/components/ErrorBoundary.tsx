import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

// Last-resort UI: an uncaught render error otherwise white-screens the whole SPA.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center bg-base text-primary">
        <span className="text-5xl">😵</span>
        <h1 className="text-xl font-extrabold">Algo se rompió</h1>
        <p className="text-sm text-muted max-w-sm">
          Ocurrió un error inesperado. Probá recargar la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-11 px-5 rounded-lg bg-accent text-on-accent font-bold text-sm"
        >
          Recargar
        </button>
      </div>
    )
  }
}
