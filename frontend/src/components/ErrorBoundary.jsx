import { Component } from 'react';
import Error from './UI/Error';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full">
            <Error
              message={this.state.error?.message || 'Something went wrong'}
              onRetry={this.handleReset}
              fullScreen={false}
            />
            {import.meta.env.DEV && this.state.errorInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Error Details:</h3>
                <pre className="text-xs text-gray-700 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
