import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryLabels {
  title: string;
  message: string;
  reload: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  labels: ErrorBoundaryLabels;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[hsl(222_47%_6%)] p-6 text-center text-[hsl(210_40%_98%)]"
        >
          <h1 className="text-2xl font-semibold">{this.props.labels.title}</h1>
          <p className="max-w-md text-sm text-[hsl(215_20%_65%)]">{this.props.labels.message}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="min-h-12 rounded-lg bg-[hsl(217_91%_60%)] px-6 py-2 text-sm font-medium text-[hsl(222_47%_6%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]"
          >
            {this.props.labels.reload}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
