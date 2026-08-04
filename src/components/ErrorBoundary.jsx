import { Component } from 'react'

/**
 * Evita ecrã branco silencioso se o React rebentar no arranque.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crash', error, info?.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-creme px-6 text-center"
        style={{
          backgroundColor: '#FAF8F2',
          color: '#1A2E24',
          fontFamily: 'system-ui, sans-serif',
        }}
        role="alert"
      >
        <img
          src="/mark.svg"
          alt=""
          width="56"
          height="56"
          style={{ borderRadius: 14 }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1B5E3F',
          }}
        >
          Algo correu mal
        </h1>
        <p style={{ margin: 0, maxWidth: 28 * 16, fontSize: '0.9rem', opacity: 0.7 }}>
          Não foi possível abrir a app. Tenta novamente — se continuar, limpa os
          dados do site no browser e reabre.
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            marginTop: 8,
            border: 'none',
            borderRadius: 12,
            background: '#1B5E3F',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '12px 20px',
            cursor: 'pointer',
          }}
        >
          Tentar de novo
        </button>
      </div>
    )
  }
}
