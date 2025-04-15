import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  createBrowserRouter, 
  RouterProvider,
  UNSAFE_DataRouterStateContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext
} from 'react-router-dom';
import App from './App';
import { routes } from './router';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: routes,
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
