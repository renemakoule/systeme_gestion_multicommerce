const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

// Priorité: 1. Variables d'Environnement (.env.local) 2. IP Dynamique (Réseau Local) 3. Localhost strict
export const API_URL = envApiUrl || (typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8001`
  : "http://127.0.0.1:8001");

export const WS_URL = envWsUrl || (typeof window !== 'undefined'
  ? `ws://${window.location.hostname}:8001/ws`
  : "ws://127.0.0.1:8001/ws");
