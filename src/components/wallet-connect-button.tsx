// src/components/wallet-connect-button.tsx - Terminal Style
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
import { Copy, LogOut, Wallet, ChevronDown, Activity, AlertTriangle, Hash, Link } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
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
      toast.success('WALLET_ADDRESS_COPIED');
    }
  };

  const handleConnect = async () => {
    if (wallet) {
      try {
        await connect();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error('CONNECTION_FAILED');
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
          className={`h-8 px-3 text-xs font-mono border-primary/30 ${className}`}
          size="sm"
          variant="outline"
        >
          <Wallet className="w-3 h-3 mr-2 text-primary" />
          <span className="hidden sm:inline text-primary">{wallet ? 'CONNECT' : 'SELECT_WALLET'}</span>
          <span className="sm:hidden">{wallet ? 'LINK' : 'WALLET'}</span>
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
      <Button
        disabled
        className={`h-8 px-3 text-xs font-mono border-primary/30 ${className}`}
        size="sm"
        variant="outline"
      >
        <Activity className="w-3 h-3 mr-2 animate-spin" />
        <span className="hidden sm:inline">CONNECTING...</span>
        <span className="sm:hidden">SYNC...</span>
      </Button>
    );
  }

  if (connected && publicKey) {
    const fullAddress = publicKey.toBase58();
    const truncatedAddress = `${fullAddress.slice(0, 4)}...${fullAddress.slice(-4)}`;
    const shortAddress = `${fullAddress.slice(0, 3)}...${fullAddress.slice(-3)}`;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`${className} flex items-center gap-2 h-8 px-2 text-xs font-mono border-primary/30 bg-green-500/10 text-green-500 hover:bg-green-500/20`}
            size="sm"
          >
            <Avatar className="w-4 h-4 border border-primary/20">
              <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
              <AvatarFallback className="bg-muted/50">
                <Wallet className="w-2 h-2" />
              </AvatarFallback>
            </Avatar>
            <span className="font-mono hidden sm:inline">{truncatedAddress}</span>
            <span className="font-mono sm:hidden">{shortAddress}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 sm:w-72 bg-background border border-primary/30 font-mono">
          {/* Terminal Header */}
          <div className="px-3 py-2 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-primary font-bold text-sm font-mono">WALLET_INTERFACE</span>
              <Badge variant="secondary" className="text-xs font-mono bg-green-500/20 text-green-500">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                LINKED
              </Badge>
            </div>
          </div>

          {/* Wallet Info Section */}
          <div className="px-3 py-3 bg-muted/30 border-b border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 border border-primary/20">
                <AvatarImage src={wallet?.adapter.icon} alt={wallet?.adapter.name} />
                <AvatarFallback className="bg-muted/50 font-mono">
                  <Wallet className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-bold text-primary text-sm font-mono">{wallet?.adapter.name?.toUpperCase()}</div>
                <div className="text-xs text-muted-foreground font-mono">PROVIDER_AUTHENTICATED</div>
              </div>
            </div>

            {/* Address Display */}
            <div className="bg-muted/50 border border-primary/10 rounded p-2">
              <div className="text-muted-foreground text-xs mb-1 font-mono">WALLET_ADDRESS</div>
              <div className="text-xs font-mono text-primary break-all leading-relaxed">
                {fullAddress}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <div className="p-1">
            <DropdownMenuItem
              onClick={copyAddress}
              className="font-mono text-xs h-8 px-3 hover:bg-muted/50"
            >
              <Copy className="w-4 h-4 mr-3 text-primary" />
              <span>COPY_ADDRESS</span>
              <Hash className="w-3 h-3 ml-auto text-muted-foreground" />
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setShowWalletSelect(true)}
              className="font-mono text-xs h-8 px-3 hover:bg-muted/50"
            >
              <Link className="w-4 h-4 mr-3 text-primary" />
              <span>CHANGE_PROVIDER</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="border-primary/20" />

            <DropdownMenuItem
              onClick={disconnect}
              className="font-mono text-xs h-8 px-3 text-red-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              <span>DISCONNECT</span>
              <LogOut className="w-3 h-3 ml-auto" />
            </DropdownMenuItem>
          </div>

          {/* Terminal Footer */}
          <div className="px-3 py-2 border-t border-primary/20 bg-muted/20">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>WALLET_v2089</span>
              <span>STATUS_ACTIVE</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
