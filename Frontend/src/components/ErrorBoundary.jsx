import React, { Component } from 'react';

/**
 * Frontera de error global: un crash en cualquier pantalla muestra una
 * vista de recuperación en español en lugar de dejar la app en blanco.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 16,
            fontFamily: 'system-ui, sans-serif',
            background: '#0F172A',
            color: '#E2E8F0',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 22, margin: 0 }}>Algo salió mal</h1>
          <p style={{ color: '#94A3B8', maxWidth: 420, margin: 0 }}>
            Ocurrió un error inesperado. Puedes volver a intentarlo; si el
            problema persiste, contáctanos por soporte.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
