import Header from './component/Header'
import Home from './component/Home'
import Footer from './component/Footer'
import { Routes, Route } from 'react-router-dom'
import DocsRoutes from "./pages/DocsRoutes";
import { DocsNavigationProvider } from "./contexts/DocsNavigationContext";

export default function App() {
 
  return (
    <div className="container">
      <Header />

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

      <Footer />      
    </div>
  )
}
