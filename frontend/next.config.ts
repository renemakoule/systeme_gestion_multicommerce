/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Génère des fichiers statiques (indispensable pour Electron)
  distDir: "out", // Dossier de sortie
  trailingSlash: true, // Améliore la résolution des routes statiques sous Electron
  images: {
    unoptimized: true, // Les images Next.js standard demandent un serveur, on les désactive ici
  },
  // Autoriser l'accès depuis d'autres appareils sur le réseau local
  allowedDevOrigins: ['192.168.1.159', 'localhost'],
};

export default nextConfig;
