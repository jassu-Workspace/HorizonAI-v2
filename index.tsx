import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './types';

// Simple Error Boundary to catch crashes in production-like environments
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 20, textAlign: 'center', fontFamily: 'sans-serif', color: '#333'}}>
            <h1>Something went wrong.</h1>
            <p>Please refresh the page.</p>
            <pre style={{color: 'red', background: '#f0f0f0', padding: 10, borderRadius: 5, overflow: 'auto'}}>
                {this.state.error?.toString()}
            </pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
        </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);