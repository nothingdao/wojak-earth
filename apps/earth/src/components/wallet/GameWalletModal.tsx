import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import type { Wallet } from '@solana/wallet-adapter-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletModalContext } from '@solana/wallet-adapter-react-ui'
import { ExternalLink, X } from 'lucide-react'

const GameWalletModal: React.FC<{ setVisible: (visible: boolean) => void }> = ({ setVisible }) => {
  const { wallets, select } = useWallet()
  const [expanded, setExpanded] = useState(false)

  const [listedWallets, collapsedWallets] = useMemo(() => {
    const installed: Wallet[] = []
    const rest: Wallet[] = []

    for (const wallet of wallets) {
      if (wallet.readyState === WalletReadyState.Installed) installed.push(wallet)
      else rest.push(wallet)
    }

    return installed.length ? [installed, rest] : [rest, [] as Wallet[]]
  }, [wallets])

  const close = useCallback(() => setVisible(false), [setVisible])

  const handleSelect = useCallback((name: string) => {
    select(name as Parameters<typeof select>[0])
    close()
  }, [select, close])

  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const visibleWallets = expanded ? [...listedWallets, ...collapsedWallets] : listedWallets

  return createPortal(
    <div className="fixed inset-0 z-[1040] flex items-center justify-center font-mono">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={close} />

      <div className="relative z-10 w-full max-w-sm mx-4 bg-background text-foreground border border-primary/30 shadow-2xl shadow-primary/10">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary/20">
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
            Connect Wallet
          </span>
          <button
            onClick={close}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>

        {visibleWallets.length > 0 ? (
          <>
            {visibleWallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                onClick={() => handleSelect(wallet.adapter.name)}
                className="w-full flex items-center gap-3 px-5 py-3 border-b border-primary/10 hover:bg-primary/10 transition-colors text-left"
              >
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-5 h-5 rounded shrink-0"
                />
                <span className="text-xs text-foreground flex-1">
                  {wallet.adapter.name}
                </span>
                {wallet.readyState === WalletReadyState.Installed && (
                  <span className="text-[9px] text-primary uppercase tracking-wider shrink-0">
                    Detected
                  </span>
                )}
              </button>
            ))}

            {!expanded && collapsedWallets.length > 0 && (
              <button
                onClick={() => setExpanded(true)}
                className="w-full px-5 py-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                + {collapsedWallets.length} more option{collapsedWallets.length !== 1 ? 's' : ''}
              </button>
            )}
          </>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-xs text-muted-foreground">
              You'll need a Solana wallet to enter Earth.
            </p>
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-[10px] text-primary hover:text-foreground transition-colors"
            >
              Get Phantom <ExternalLink size={9} />
            </a>
          </div>
        )}

        <div className="px-5 py-3 border-t border-primary/20">
          <p className="text-[9px] text-muted-foreground text-center uppercase tracking-widest">
            Solana Wallet Standard
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

const GameWalletModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false)

  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      {children}
      {visible && <GameWalletModal setVisible={setVisible} />}
    </WalletModalContext.Provider>
  )
}

export default GameWalletModalProvider
