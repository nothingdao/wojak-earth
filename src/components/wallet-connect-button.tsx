"use client";

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Copy, LogOut, Wallet, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { WalletSelectModal } from './wallet-select-modal';

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { publicKey, disconnect, wallet, connect, connecting, connected } = useWallet();
  const [showWalletSelect, setShowWalletSelect] = useState(false);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      toast.success('Address copied to clipboard');
    }
  };

  const handleConnect = async () => {
    if (wallet) {
      try {
        await connect();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error('Failed to connect wallet');
      }
    } else {
      setShowWalletSelect(true);
    }
  };

  if (!connected && !connecting) {
    return (
      <>
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className={className}
        >
          <Wallet className="w-4 h-4 mr-2" />
          {wallet ? 'Connect' : 'Select Wallet'}
        </Button>
        <WalletSelectModal
          open={showWalletSelect}
          onOpenChange={setShowWalletSelect}
        />
      </>
    );
  }

  if (connecting) {
    return (
      <Button disabled className={className}>
        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Connecting...
      </Button>
    );
  }

  if (connected && publicKey) {
    const truncatedAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`${className} flex items-center gap-2`}>
            <Avatar className="w-4 h-4">
              <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
              <AvatarFallback>
                <Wallet className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <span className="font-thin">{truncatedAddress}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
                <AvatarFallback>
                  <Wallet className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{wallet?.adapter.name}</p>
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-mono break-all">
              {publicKey.toBase58()}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowWalletSelect(true)}>
            <Wallet className="w-4 h-4 mr-2" />
            Change Wallet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
