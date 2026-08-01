import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

interface State { error: Error | null }

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SIGECOM render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="runtime-error">
          <strong>No fue posible mostrar esta pantalla.</strong>
          <p>{this.state.error.message}</p>
          <button type="button" className="primary-button" onClick={() => { this.setState({ error: null }); window.location.assign('/dashboard') }}>
            Volver al dashboard
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
