import { createBrowserRouter } from 'react-router';

import PlaceholderPage from './pages/PlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PlaceholderPage />,
  },
]);
