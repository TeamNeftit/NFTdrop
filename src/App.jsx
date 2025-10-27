import Home from './component/Home'
import Footer from './component/Footer'
import { Routes, Route, useLocation } from 'react-router-dom'
import DocsRoutes from "./pages/DocsRoutes";
import { DocsNavigationProvider } from "./contexts/DocsNavigationContext";

function AppContent() {
  const location = useLocation();
  const isDocsPage = location.pathname.startsWith('/docs');

  return (
    <div className="container">

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/docs/*"
          element={
            <DocsNavigationProvider>
              <DocsRoutes />
            </DocsNavigationProvider>
          }
        />
      </Routes>

      {!isDocsPage && <Footer />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
