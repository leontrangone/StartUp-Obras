import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './lib/store.jsx';
import { SesionProvider, useSesion } from './lib/sesion.jsx';
import { Acceso, Cargando } from './pages/Acceso.jsx';
import App from './App.jsx';
// Tipografías incluidas en la app (funcionan sin internet)
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './styles.css';

// Sin sesión → pantalla de acceso. Con sesión → la app con los datos de ese usuario.
function Puerta() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <Acceso />;
  return (
    <StoreProvider key={usuario.id}>
      <App />
    </StoreProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SesionProvider>
      <Puerta />
    </SesionProvider>
  </React.StrictMode>,
);
