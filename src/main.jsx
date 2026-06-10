import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ClientPage from './ClientPage.jsx'
import Landing from './Landing.jsx'

function UnsubscribeRedirect() {
  const { search } = useLocation();
  useEffect(() => {
    window.location.replace(`/api/unsubscribe${search}`);
  }, [search]);
  return null;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<App />} />
        <Route path="/client/:slug" element={<ClientPage />} />
        <Route path="/unsubscribe" element={<UnsubscribeRedirect />} />
        <Route path="/:slug" element={<ClientPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
