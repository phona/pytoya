import { Component, ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  message?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

const DEFAULT_TITLE = 'Something went wrong';
const DEFAULT_MESSAGE =
  'We hit an unexpected issue while loading this page. You can try again or go back.';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Web app error boundary caught an error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {this.props.title ?? DEFAULT_TITLE}
            </h1>
            <p className="text-sm text-muted-foreground">
              {this.props.message ?? DEFAULT_MESSAGE}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              Go back
            </button>
            <a
              href="/"
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              Go to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}




