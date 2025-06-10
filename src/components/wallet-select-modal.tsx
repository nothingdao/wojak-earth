"use client";

import { useWallet } from '@solana/wallet-adapter-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Wallet, Database, Activity, Signal, Terminal, Zap } from 'lucide-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { toast } from 'sonner';

interface WalletSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletSelectModal({ open, onOpenChange }: WalletSelectModalProps) {
  const { wallets, select, connect } = useWallet();

  const handleWalletSelect = async (walletName: string) => {
    try {
      // @ts-expect-error lmao
      select(walletName);
      await connect();
      onOpenChange(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to connect to wallet');
    }
  };

  const installedWallets = wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.Installed
  );

  const notDetectedWallets = wallets.filter(
    (wallet) => wallet.readyState === WalletReadyState.NotDetected
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border border-primary/30 font-mono">
        {/* Terminal Header */}
        <DialogHeader className="border-b border-primary/20 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <DialogTitle className="text-primary font-bold text-sm font-mono">
                WALLET_CONNECTION_PROTOCOL v2.089
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse text-primary" />
              <span className="text-primary text-xs">SCANNING</span>
            </div>
          </div>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            SELECT_AUTHENTICATION_MODULE_FOR_BLOCKCHAIN_ACCESS
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3 p-1">
            {installedWallets.length > 0 && (
              <div className="space-y-2">
                <div className="bg-muted/30 border border-primary/20 rounded p-2">
                  <div className="flex items-center gap-2">
                    <Signal className="w-3 h-3 text-green-500" />
                    <h4 className="text-xs font-bold text-green-500 font-mono">DETECTED_WALLETS</h4>
                    <Badge variant="outline" className="text-xs font-mono">
                      {installedWallets.length}_FOUND
                    </Badge>
                  </div>
                </div>
                {installedWallets.map((wallet) => (
                  <Button
                    key={wallet.adapter.name}
                    variant="outline"
                    className="w-full justify-start h-auto p-3 font-mono bg-muted/20 border-primary/20 hover:bg-muted/40"
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                  >
                    <div className="w-6 h-6 mr-2 bg-primary/20 rounded flex items-center justify-center">
                      {wallet.adapter.icon ? (
                        <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-4 h-4" />
                      ) : (
                        <Wallet className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-bold text-xs">
                          {wallet.adapter.name.toUpperCase()}
                        </span>
                        <Badge variant="default" className="text-xs font-mono bg-green-500/20 text-green-400">
                          READY
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        AUTHENTICATION_MODULE_AVAILABLE
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {notDetectedWallets.length > 0 && (
              <div className="space-y-2">
                <div className="bg-muted/30 border border-yellow-500/30 rounded p-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-yellow-500" />
                    <h4 className="text-xs font-bold text-yellow-500 font-mono">INSTALLATION_REQUIRED</h4>
                    <Badge variant="outline" className="text-xs font-mono text-yellow-500">
                      {notDetectedWallets.length}_AVAILABLE
                    </Badge>
                  </div>
                </div>
                {notDetectedWallets.map((wallet) => (
                  <div
                    key={wallet.adapter.name}
                    className="flex items-center justify-between p-3 bg-muted/20 border border-yellow-500/20 rounded font-mono"
                  >
                    <div className="flex items-center">
                      <div className="w-6 h-6 mr-2 bg-yellow-500/20 rounded flex items-center justify-center">
                        {wallet.adapter.icon ? (
                          <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-4 h-4" />
                        ) : (
                          <Wallet className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <span className="text-primary font-bold text-xs">
                          {wallet.adapter.name.toUpperCase()}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          MODULE_NOT_DETECTED
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(wallet.adapter.url, '_blank')}
                      className="text-xs font-mono h-6 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      INSTALL
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {installedWallets.length === 0 && notDetectedWallets.length === 0 && (
              <div className="bg-red-950/20 border border-red-500/30 rounded p-4 text-center">
                <div className="text-red-500 text-2xl mb-2">⚠</div>
                <div className="text-red-500 font-bold text-xs font-mono mb-1">
                  NO_WALLET_MODULES_DETECTED
                </div>
                <div className="text-red-400 text-xs font-mono">
                  INSTALL_COMPATIBLE_WALLET_SOFTWARE
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* System Info Footer */}
        <div className="border-t border-primary/20 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" />
              <span>SOLANA_DEVNET_COMPATIBLE</span>
            </div>
            <div>
              SECURE_CONNECTION_PROTOCOL
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
