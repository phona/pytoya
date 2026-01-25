import { Component, ErrorInfo, ReactNode } from 'react';
import { I18nContext, type I18nContextValue } from '@/shared/providers/I18nProvider';
import { isMissingTranslation } from '@/shared/i18n/translate';
import { BASE_PATH } from '@/api/client';
import { joinBasePath } from '@/shared/utils/base-path';

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  message?: string;
  titleKey?: string;
  messageKey?: string;
  titleVars?: Record<string, unknown>;
  messageVars?: Record<string, unknown>;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

const DEFAULT_TITLE = 'Something went wrong';
const DEFAULT_MESSAGE =
  'We hit an unexpected issue while loading this page. You can try again or go back.';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = I18nContext;
  declare context: I18nContextValue | null;

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

    const t = this.context?.t;
    const translateOrFallback = (
      key: string,
      fallback: string,
      vars?: Record<string, unknown>,
    ) => {
      if (!t) {
        return fallback;
      }
      const value = t(key, vars);
      return isMissingTranslation(value) ? fallback : value;
    };

    const title =
      this.props.title ??
      (this.props.titleKey
        ? translateOrFallback(this.props.titleKey, DEFAULT_TITLE, this.props.titleVars)
        : translateOrFallback('errorBoundary.defaultTitle', DEFAULT_TITLE));

    const message =
      this.props.message ??
      (this.props.messageKey
        ? translateOrFallback(
            this.props.messageKey,
            DEFAULT_MESSAGE,
            this.props.messageVars,
          )
        : translateOrFallback('errorBoundary.defaultMessage', DEFAULT_MESSAGE));

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {translateOrFallback('errorBoundary.retry', 'Try again')}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              {translateOrFallback('errorBoundary.back', 'Go back')}
            </button>
            <a
              href={joinBasePath(BASE_PATH, '/')}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
            >
              {translateOrFallback('errorBoundary.home', 'Go to home')}
            </a>
          </div>
        </div>
      </div>
    );
  }
}




