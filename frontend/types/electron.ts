export interface IElectronAPI {
  syncTitleBar: (colors: { bg: string; fg: string }) => void;
  createNewWindow: () => void;
}

declare global {
  interface Window {
    // On ajoute electronAPI à l'interface globale Window
    electronAPI: IElectronAPI;
  }
}

// Important pour transformer ce fichier en module
export {};
