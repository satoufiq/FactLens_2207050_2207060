import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FactLens UI Error Boundary Caught]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          background: '#060A09',
          color: '#E2E8E5',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '50%',
            padding: 16,
            marginBottom: 16
          }}>
            <AlertTriangle size={36} color="#EF4444" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0' }}>
            {this.props.fallbackTitle || 'Component Render Alert'}
          </h2>
          <p style={{ fontSize: 13, color: '#8E9E97', maxWidth: 460, margin: '0 0 24px 0', lineHeight: 1.6 }}>
            {this.state.error?.message || 'A transient UI rendering issue occurred. Click reload below to refresh the console state.'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#00E599',
                color: '#040A07',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} /> Reload Interface
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/app';
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid #1B2923',
                background: '#0F1714',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <Home size={14} /> Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
