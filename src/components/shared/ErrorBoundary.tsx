// =============================================================================
// Nioh 2 Build Forge — Error Boundary
//
// An error boundary is a React component that catches JavaScript errors
// anywhere in its child component tree and displays a fallback UI instead
// of crashing the entire application.
//
// WHY THIS MATTERS:
// Without error boundaries, a single crash in the BuildAnalysis screen
// would wipe out the entire app — including the CharacterSheet data
// the player just spent time entering. An error boundary contains the
// damage to just the screen that failed, leaving everything else intact.
//
// NOTE: Error boundaries must be class components in React. This is one
// of the few remaining cases where class syntax is required — function
// components cannot implement componentDidCatch.
// =============================================================================
import React, { Component, ReactNode } from 'react';

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;  // optional custom fallback UI
  screenName?: string;   // identifies which screen crashed for debugging
}

interface State {
  hasError:   boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  // componentDidCatch fires when a child component throws.
  // It receives the error and a stack trace we can use for debugging.
  componentDidCatch(error: Error) {
    console.error(`Error in ${this.props.screenName ?? 'component'}:`, error);
    this.setState({
      hasError: true,
      errorMessage: error.message,
    });
  }

  // getDerivedStateFromError is called during rendering when a child throws.
  // It returns the new state that triggers the fallback UI.
  static getDerivedStateFromError(): State {
    return { hasError: true, errorMessage: '' };
  }

  render() {
    if (this.state.hasError) {
      // If the parent provided a custom fallback, use it.
      if (this.props.fallback) return this.props.fallback;

      // Otherwise use the default recovery UI.
      return (
        <div style={{
          padding: '32px', textAlign: 'center',
          background: '#1f2937', borderRadius: '10px', margin: '24px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444', fontWeight: 700, marginBottom: '8px' }}>
            {this.props.screenName ?? 'This screen'} encountered an error
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
            Your build data is safe. This screen failed to render but no data was lost.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            style={{
              background: '#f59e0b', border: 'none', color: '#000',
              padding: '10px 20px', borderRadius: '8px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {this.state.errorMessage && (
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '16px', fontFamily: 'monospace' }}>
              {this.state.errorMessage}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
