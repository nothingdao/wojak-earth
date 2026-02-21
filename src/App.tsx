
// src/App.tsx - With styled terminal toast
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { NetworkProvider, useNetwork } from '@/contexts/NetworkContext';
import { GameProvider } from '@/providers/GameProvider';
import { AppRouter } from '@/components/AppRouter';
import { Toaster } from '@/components/ui/toaster';
import { StoryDialog, useStoryDialog } from '@/components/ui/story-dialog';
import { useState, useEffect, useMemo } from 'react';
import DocsViewer from '@/components/docs/DocsViewer';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamic connection provider that reacts to network changes
function DynamicConnectionProvider({ children }: { children: React.ReactNode }) {
  const { network, getRpcUrl } = useNetwork();

  const endpoint = useMemo(() => {
    const url = getRpcUrl();
    return url;
  }, [network, getRpcUrl]);

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function App() {
  // Network state - starts with devnet
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);
  const [showDocsScreen, setShowDocsScreen] = useState(false);
  const storyDialog = useStoryDialog();

  // Prevent zoom
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || (e.key === '0'))) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventZoom, { passive: false });
    document.addEventListener('keydown', preventKeyboardZoom);
    return () => {
      document.removeEventListener('wheel', preventZoom);
      document.removeEventListener('keydown', preventKeyboardZoom);
    };
  }, []);

  return (
    <NetworkProvider network={network} setNetwork={setNetwork}>
      <DynamicConnectionProvider>
        <GameProvider>
          <AppRouter showDocsScreen={showDocsScreen} setShowDocsScreen={setShowDocsScreen} />
          <Toaster />
          <StoryDialog
            isOpen={storyDialog.isOpen}
            screens={storyDialog.screens}
            onComplete={storyDialog.onComplete}
            onDismiss={storyDialog.onDismiss}
            storyId={storyDialog.storyId}
          />
        </GameProvider>
      </DynamicConnectionProvider>
    </NetworkProvider>
  );
}



