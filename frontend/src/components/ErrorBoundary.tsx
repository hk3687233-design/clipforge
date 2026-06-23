"use client";
import { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="glass border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-5">
            <div className="w-14 h-14 bg-red-500/15 border border-red-500/25 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="font-bold text-white text-lg">Something went wrong</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm">
              <RefreshCw size={14} /> Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
