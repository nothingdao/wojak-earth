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
          className={`h-10 sm:h-9 px-4 sm:px-3 text-sm ${className}`}
          size="sm"
        >
          <Wallet className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{wallet ? 'Connect' : 'Select Wallet'}</span>
          <span className="sm:hidden">{wallet ? 'Connect' : 'Wallet'}</span>
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
      <Button disabled className={`h-10 sm:h-9 px-4 sm:px-3 text-sm ${className}`} size="sm">
        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="hidden sm:inline">Connecting...</span>
        <span className="sm:hidden">...</span>
      </Button>
    );
  }

  if (connected && publicKey) {
    const truncatedAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;
    const shortAddress = `${publicKey.toBase58().slice(0, 3)}...${publicKey.toBase58().slice(-3)}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`${className} flex items-center gap-2 h-10 sm:h-9 px-3 sm:px-2 text-sm`}
            size="sm"
          >
            <Avatar className="w-4 h-4 sm:w-4 sm:h-4">
              <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
              <AvatarFallback>
                <Wallet className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
            <span className="font-thin hidden sm:inline">{truncatedAddress}</span>
            <span className="font-thin sm:hidden">{shortAddress}</span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 sm:w-64">
          <div className="px-3 py-2 sm:px-2 sm:py-1.5">
            <div className="flex items-center gap-3 sm:gap-2 mb-3 sm:mb-2">
              <Avatar className="w-10 h-10 sm:w-8 sm:h-8">
                <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
                <AvatarFallback>
                  <Wallet className="w-5 h-5 sm:w-4 sm:h-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-base sm:text-sm">{wallet?.adapter.name}</p>
                <Badge variant="secondary" className="text-xs">
                  Connected
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-mono break-all leading-relaxed">
              {publicKey.toBase58()}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress} className="py-3 sm:py-2">
            <Copy className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
            <span className="text-base sm:text-sm">Copy Address</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowWalletSelect(true)} className="py-3 sm:py-2">
            <Wallet className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
            <span className="text-base sm:text-sm">Change Wallet</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect} className="text-destructive py-3 sm:py-2">
            <LogOut className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
            <span className="text-base sm:text-sm">Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
