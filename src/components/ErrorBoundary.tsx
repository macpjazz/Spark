import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-gray-600 mb-4">Page not found</p>
            <Link 
              to="/" 
              className="text-blue-500 hover:text-blue-600 underline"
            >
              Go back home
            </Link>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Oops!</h1>
        <p className="text-gray-600 mb-4">Something went wrong</p>
        <Link 
          to="/" 
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
