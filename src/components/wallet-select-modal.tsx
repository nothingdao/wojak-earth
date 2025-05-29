"use client";

import React from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Wallet } from 'lucide-react';
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
      select(walletName);
      await connect();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to this application.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {installedWallets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Installed Wallets</h4>
                {installedWallets.map((wallet) => (
                  <Button
                    key={wallet.adapter.name}
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                  >
                    <Avatar className="w-8 h-8 mr-3">
                      <AvatarImage src={wallet.adapter.icon} alt={wallet.adapter.name} />
                      <AvatarFallback>
                        <Wallet className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{wallet.adapter.name}</span>
                        <Badge variant="default" className="text-xs">Installed</Badge>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
            
            {notDetectedWallets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Available Wallets</h4>
                {notDetectedWallets.map((wallet) => (
                  <div
                    key={wallet.adapter.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarImage src={wallet.adapter.icon} alt={wallet.adapter.name} />
                        <AvatarFallback>
                          <Wallet className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{wallet.adapter.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(wallet.adapter.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Install
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}