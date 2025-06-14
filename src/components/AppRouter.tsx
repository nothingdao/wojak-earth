// src/components/AppRouter.tsx - Simplified with auto network switching
import React from 'react'
import { useGame } from '@/providers/GameProvider'
import { useNetwork } from '@/contexts/NetworkContext'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Loader2, Database, User, Zap, AlertTriangle, Activity, Terminal, TriangleAlert } from 'lucide-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

// Import your existing game components
import { GameScreen } from '@/components/screens/GameScreen'
import { CharacterCreationScreen } from '@/components/screens/CharacterCreationScreen'
import { ReservationScreen } from '@/components/screens/ReservationScreen'
import { TopControls } from './TopControls'

export function AppRouter() {
  const { state, actions } = useGame()
  const { connected, publicKey } = useWallet()
  const { isMainnet, isDevnet, setNetwork } = useNetwork()

  console.log('Wallet Connected:', connected)
  console.log('Wallet PublicKey:', publicKey?.toBase58())

  const [showReservation, setShowReservation] = React.useState(false)
  const [showReservationSuccess, setShowReservationSuccess] = React.useState(false) // NEW: Track success state


  // Auto-switch to devnet by default (for game)
  React.useEffect(() => {
    if (connected && !showReservation && !showReservationSuccess && !isDevnet) {
      console.log('🔄 Auto-switching to devnet for game access')
      setNetwork(WalletAdapterNetwork.Devnet)
    }
  }, [connected, showReservation, showReservationSuccess, isDevnet, setNetwork])

  // Auto-switch to mainnet when showing reservations
  React.useEffect(() => {
    if (showReservation && !isMainnet) {
      console.log('🔄 Auto-switching to mainnet for reservations')
      setNetwork(WalletAdapterNetwork.Mainnet)
    }
  }, [showReservation, isMainnet, setNetwork])

  // Show reservation screen (auto-switches to mainnet)
  if (showReservation) {
    return (
      <ReservationScreen
        onReservationComplete={() => {
          console.log('✅ Reservation complete, showing success screen')
          setShowReservation(false)
          setShowReservationSuccess(true) // Show success instead of switching immediately
        }}
        onBackToNetworkSelect={() => {
          console.log('🔙 Back from reservations, switching to devnet')
          setShowReservation(false)
          setShowReservationSuccess(false)
          setNetwork(WalletAdapterNetwork.Devnet)
        }}
      />
    )
  }

  // NEW: Show reservation success screen
  if (showReservationSuccess) {
    return <ReservationSuccessScreen
      onContinue={() => {
        console.log('🎮 Continuing to game after reservation')
        setShowReservationSuccess(false)
        setNetwork(WalletAdapterNetwork.Devnet)
      }}
    />
  }

  // Normal game flow (always on devnet)
  switch (state.appState) {
    case 'wallet-required':
      return <WalletConnectScreen />

    case 'checking-character':
      return <CheckingCharacterScreen />

    case 'character-required':
      return (
        <CharacterRequiredScreen
          onShowReservation={() => {
            console.log('🎯 User wants reservations, will auto-switch to mainnet')
            setShowReservation(true)
          }}
        />
      )

    case 'entering-game':
      return <EnteringGameScreen />

    case 'ready':
      return <GameScreen />

    case 'error':
      return <ErrorScreen error={state.error} onRetry={actions.handleRetry} />

    default:
      return <LoadingScreen message="Initializing..." />
  }
}

// NEW: Dedicated success screen component
function ReservationSuccessScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <TopControls />
      <div className="w-full max-w-md mx-auto bg-background border border-success rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-success pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-success" />
            <span className="text-success font-bold text-sm">RESERVATION_CONFIRMED v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-success" />
            <span className="text-success text-xs">VERIFIED</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="border border-success rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-success font-bold mb-1">RESERVATION_SECURED</div>
            <div className="text-success text-xs">
              PRIORITY_ACCESS_GRANTED
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              🎉 Welcome to the EARTH 2089 whitelist! Your spot is secured for the NFT launch.
            </p>
          </div>

          <div className="bg-muted/20 border border-primary/10 rounded p-3">
            <div className="text-xs text-muted-foreground font-mono">
              <div className="text-success text-xs font-bold mb-2">[NEXT_STEPS]</div>
              <div className="space-y-1">
                <div>• Your mainnet reservation is confirmed</div>
                <div>• NFT launch notifications via X (Twitter)</div>
                <div>• Try the game prototype on devnet below</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={onContinue}
              className="w-full font-mono text-sm h-10"
            >
              <Zap className="w-4 h-4 mr-2" />
              CONTINUE_TO_GAME_TESTING
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Switching to devnet for free game testing...
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-success pt-3 mt-4">
          RESERVATION_SYSTEM_v2089 | WHITELIST_CONFIRMED
        </div>
      </div>
    </div>
  )
}

// Simplified WalletConnectScreen - no network selection
function WalletConnectScreen() {

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">

      <TopControls />

      <div className="w-full max-w-md mx-auto bg-background border rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-border">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">EARTH_2029 v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span className="text-success text-xs">READY</span>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-background border rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-primary font-bold text-lg mb-2">WELCOME_TO_EARTH</div>
            <div className="text-muted-foreground text-xs">
              Connect your wallet. Use Mainnet for the NFT reservation system and use Devnet for game testing. Thanks!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground font-mono text-center border-t pt-3 mt-4 border-border">
          EARTH_v2089 | POST_APOCALYPTIC_AND_CHILL
        </div>
      </div>
    </div>
  )
}

function CheckingCharacterScreen() {
  const { actions } = useGame()
  const [scanProgress, setScanProgress] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState(0)
  const [scanMessages, setScanMessages] = React.useState<string[]>([])
  const [completedSteps, setCompletedSteps] = React.useState<boolean[]>([false, false, false, false])

  React.useEffect(() => {
    const runScanSequence = async () => {
      try {
        // Step 1: Wallet Analysis (0-25%)
        setCurrentStep(1)
        addMessage("Initializing wallet scanner...")
        await animateProgress(0, 25, 1000)
        markComplete(0)
        addMessage("Wallet connection verified ✓")
        await pause(200)

        // Step 2: NFT Scan (25-50%)
        setCurrentStep(2)
        addMessage("Scanning for NFT characters...")
        await animateProgress(25, 50, 1000)
        markComplete(1)
        addMessage("NFT collection analyzed ✓")
        await pause(200)

        // Step 3: Database Query (50-75%)
        setCurrentStep(3)
        addMessage("Querying character database...")
        await animateProgress(50, 75, 1000)
        markComplete(2)
        addMessage("Database query complete ✓")
        await pause(200)

        // Step 4: Character Check (75-100%)
        setCurrentStep(4)
        addMessage("Validating character data...")
        await animateProgress(75, 100, 1000)
        markComplete(3)
        addMessage("Character validation complete ✓")
        await pause(200)

        // Final step - show completion
        setCurrentStep(5)
        addMessage("All scans complete ✓")
        await pause(1000)

        // NOW and ONLY NOW do the actual work
        addMessage("Processing results...")
        await actions.checkForCharacter()

      } catch (error) {
        console.error('Scan failed:', error)
        addMessage("⚠️ Scan error detected")
      }
    }

    const animateProgress = (start: number, end: number, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const startTime = Date.now()
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)

          const value = start + (end - start) * progress
          setScanProgress(Math.round(value))

          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            resolve()
          }
        }
        animate()
      })
    }

    const markComplete = (stepIndex: number) => {
      setCompletedSteps(prev => {
        const newSteps = [...prev]
        newSteps[stepIndex] = true
        return newSteps
      })
    }

    const addMessage = (message: string) => {
      setScanMessages(prev => [...prev.slice(-3), message])
    }

    const pause = (ms: number): Promise<void> => {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    runScanSequence()
  }, [actions])

  const getStepIcon = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return '✓'
    if (stepNum === currentStep) return '⟳'
    return '○'
  }

  const getStepColor = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return 'text-success'
    if (stepNum === currentStep) return 'text-primary'
    return 'text-muted-foreground'
  }

  const getStepStatus = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return 'COMPLETE'
    if (stepNum === currentStep) return 'PROCESSING...'
    return 'PENDING'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">CHARACTER_SCANNER v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep >= 5 ? (
              <Zap className="w-3 h-3 text-success" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            )}
            <span className={`text-xs ${currentStep >= 5 ? 'text-success' : 'text-primary'}`}>
              {currentStep >= 5 ? 'COMPLETE' : 'SCANNING'}
            </span>
          </div>
        </div>

        {/* Scanning Display */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center border border-primary/20">
            {currentStep >= 5 ? (
              <Zap className="w-8 h-8 text-success" />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-primary mb-2">SCANNING_BLOCKCHAIN</h2>
            <p className="text-sm text-muted-foreground">
              {currentStep >= 5 ? 'Scan complete - preparing next phase...' : 'Searching for existing survivor profiles...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>SCAN_PROGRESS</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3 border border-primary/20 overflow-hidden">
              <div
                className={`h-3 transition-all duration-200 ease-out relative ${currentStep >= 5
                  ? 'bg-gradient-to-r from-success to-success'
                  : 'bg-gradient-to-r from-primary via-primary/90 to-primary/80'
                  }`}
                style={{ width: `${scanProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Scanning Steps */}
          <div className="bg-muted/20 border border-primary/10 rounded p-3">
            <div className="text-xs text-muted-foreground font-mono space-y-1">
              <div className={`flex justify-between ${getStepColor(1)}`}>
                <span>{getStepIcon(1)} WALLET_ANALYSIS:</span>
                <span>{getStepStatus(1)}</span>
              </div>
              <div className={`flex justify-between ${getStepColor(2)}`}>
                <span>{getStepIcon(2)} NFT_SCAN:</span>
                <span>{getStepStatus(2)}</span>
              </div>
              <div className={`flex justify-between ${getStepColor(3)}`}>
                <span>{getStepIcon(3)} CHARACTER_DB:</span>
                <span>{getStepStatus(3)}</span>
              </div>
              <div className={`flex justify-between ${getStepColor(4)}`}>
                <span>{getStepIcon(4)} DATA_VALIDATION:</span>
                <span>{getStepStatus(4)}</span>
              </div>
              {currentStep >= 5 && (
                <div className="flex justify-between text-success pt-1 border-t border-primary/20">
                  <span>✓ SCAN_COMPLETE:</span>
                  <span>SUCCESS</span>
                </div>
              )}
            </div>
          </div>

          {/* Scan Log */}
          <div className="bg-muted/20 border border-primary/10 rounded p-3 min-h-[80px]">
            <div className="text-xs text-muted-foreground font-mono">
              <div className="text-primary text-xs font-bold mb-2">[SCAN_LOG]</div>
              <div className="space-y-1 text-left">
                {scanMessages.map((message, index) => (
                  <div key={index} className="opacity-75">
                    &gt; {message}
                  </div>
                ))}
                {currentStep < 5 && (
                  <div className="text-primary animate-pulse">
                    &gt; <span className="animate-ping">█</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-3 mt-4">
          CHARACTER_SCANNER_v2089 | BLOCKCHAIN_VERIFICATION
        </div>
      </div>
    </div>
  )
}

function CharacterRequiredScreen({ onShowReservation }: { onShowReservation?: () => void }) {
  const [showCreation, setShowCreation] = React.useState(false)

  if (showCreation) {
    return <CharacterCreationScreen onBack={() => setShowCreation(false)} />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 mt-3 relative">
      {/* Add TopControls here */}
      <TopControls />

      <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">

        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">REGISTRY v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-warning" />
          </div>
        </div>

        {/* Registration Info */}
        <div className="space-y-4">
          <p className="text-xs text-center text-muted-foreground">
            Reserve your spot for the official NFT launch later this year!.
          </p>
          <Button
            onClick={() => {
              onShowReservation?.()
            }}
            variant="outline"
            className="w-full border-success text-success hover:bg-success font-mono text-sm h-10"
          >
            <Database className="w-4 h-4 mr-2" />
            RESERVE_NFT_WHITELIST_SPOT
          </Button>





          <div className="space-y-3">
            <Button
              onClick={() => setShowCreation(true)}
              variant="outline"
              className="w-full font-mono text-sm h-10"
            >
              <User className="w-4 h-4 mr-2" />
              CREATE_PLAYER_PROFILE
            </Button>
          </div>

          {/* System Requirements */}
          <div className="bg-muted/20 border border-primary/10 rounded p-3 mb-4">


            <div className="text-xs text-muted-foreground font-mono">
              <div className="text-primary text-xs font-bold mb-2">[TEST_GAMING_INFORMATION]</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>DEVELOPMENT_PREVIEW_GAME_ACCESS:</span>
                  <span className="text-success">✓ FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>HARACTER_COST:</span>
                  <span className="text-primary">0.01_DEVNET_SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>NFT_STORAGE:</span>
                  <span className="text-primary">BLOCKCHAIN [devnet]</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* No Character Message */}
        {/* <div className="border border-warning rounded p-4 mb-4">
          <div className="text-center">
            <span className="text-warning text-xs">NO_PROFILE</span>
            <div className="text-warning text-xl mb-2"><TriangleAlert /></div>
            <div className="text-warning font-bold mb-1">NO_PROFILE_FOUND</div>
            <div className="text-warning text-xs">
              PLAYER_PROFILE_REQUIRED_FOR_TESTING
            </div>
          </div>
        </div> */}



        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-3 mt-4">
          REGISTRY_v2089 | EARTH_PROFILE_PROTOCOL
        </div>
      </div>
    </div>
  )
}

function EnteringGameScreen() {
  const { actions, state } = useGame()
  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const [loadingMessage, setLoadingMessage] = React.useState('Initializing systems...')
  const [currentStep, setCurrentStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<boolean[]>([false, false, false, false, false])

  React.useEffect(() => {
    const runLoadingSequence = async () => {
      try {
        // Step 1: System Init (0-20%)
        setCurrentStep(1)
        setLoadingMessage('Initializing wasteland protocols...')
        await animateProgress(0, 20, 1500)
        markComplete(0)
        setLoadingMessage('System initialization complete ✓')
        await pause(600)

        // Step 2: Network Connect (20-40%)
        setCurrentStep(2)
        setLoadingMessage('Connecting to survival network...')
        await animateProgress(20, 40, 1200)
        markComplete(1)
        setLoadingMessage('Network connection established ✓')
        await pause(600)

        // Step 3: World Data (40-70%)
        setCurrentStep(3)
        setLoadingMessage('Loading world data...')
        await animateProgress(40, 70, 1800)
        markComplete(2)
        setLoadingMessage('World data loaded ✓')
        await pause(600)

        // Step 4: Character Sync (70-90%)
        setCurrentStep(4)
        setLoadingMessage('Synchronizing character data...')
        await animateProgress(70, 90, 1000)
        markComplete(3)
        setLoadingMessage('Character sync complete ✓')
        await pause(600)

        // Step 5: Interface Prep (90-100%)
        setCurrentStep(5)
        setLoadingMessage('Preparing interface...')
        await animateProgress(90, 100, 800)
        markComplete(4)
        setLoadingMessage('Interface ready ✓')
        await pause(800)

        // Show final completion
        setLoadingMessage('All systems operational!')
        await pause(1000)

        // Final welcome message
        setLoadingMessage('Welcome to the wasteland!')
        await pause(800)

        // NOW do the actual work
        await actions.enterGame()

      } catch (error) {
        console.error('Failed to enter game:', error)
        setLoadingMessage('System error detected...')
      }
    }

    const animateProgress = (start: number, end: number, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const startTime = Date.now()
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)

          const value = start + (end - start) * progress
          setLoadingProgress(Math.round(value))

          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            resolve()
          }
        }
        animate()
      })
    }

    const markComplete = (stepIndex: number) => {
      setCompletedSteps(prev => {
        const newSteps = [...prev]
        newSteps[stepIndex] = true
        return newSteps
      })
    }

    const pause = (ms: number): Promise<void> => {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    runLoadingSequence()
  }, [actions])

  // Get step status for display
  const getStepStatus = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return 'COMPLETE'
    if (stepNum === currentStep) return 'ACTIVE'
    return 'PENDING'
  }

  const getStepColor = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return 'text-success'
    if (stepNum === currentStep) return 'text-primary'
    return 'text-muted-foreground'
  }

  const getStepIcon = (stepNum: number) => {
    if (completedSteps[stepNum - 1]) return '✓'
    if (stepNum === currentStep) return '⟳'
    return '○'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">GAME_LOADER v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 5 ? (
              <Zap className="w-3 h-3 text-success" />
            ) : (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            )}
            <span className={`text-xs ${currentStep > 5 ? 'text-success' : 'text-primary'}`}>
              {currentStep > 5 ? 'COMPLETE' : 'LOADING'}
            </span>
          </div>
        </div>

        <div className="text-center space-y-4">
          {/* Character Image Display */}
          <div className="w-24 h-24 mx-auto mb-4 bg-muted/30 rounded-xs flex items-center justify-center border-0 border-primary/30 overflow-hidden">
            {state.character?.current_image_url ? (
              <img
                src={state.character.current_image_url}
                alt={state.character.name || 'Character'}
                className="w-full h-full object-cover rounded-xs"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
            ) : null}
            <Zap
              className={`w-8 h-8 text-primary ${state.character?.current_image_url ? 'hidden' : 'block'}`}
            />
          </div>

          <div>
            <h2 className="text-lg font-bold text-primary mb-2">
              WELCOME_{state.character?.name?.toUpperCase().replace(/\s+/g, '_')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {loadingMessage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>PROGRESS</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-4 border border-primary/20 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 h-full transition-all duration-300 ease-out relative"
                style={{ width: `${loadingProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>

          {/* Loading steps */}
          <div className="bg-muted/20 border border-primary/10 rounded p-3">
            <div className="text-xs text-muted-foreground font-mono">
              <div className="text-primary text-xs font-bold mb-2">[LOADING_SEQUENCE]</div>
              <div className="space-y-1">
                <div className={`flex justify-between ${getStepColor(1)}`}>
                  <span>{getStepIcon(1)} SYSTEM_INIT</span>
                  <span>{getStepStatus(1)}</span>
                </div>
                <div className={`flex justify-between ${getStepColor(2)}`}>
                  <span>{getStepIcon(2)} NETWORK_CONNECT</span>
                  <span>{getStepStatus(2)}</span>
                </div>
                <div className={`flex justify-between ${getStepColor(3)}`}>
                  <span>{getStepIcon(3)} WORLD_DATA</span>
                  <span>{getStepStatus(3)}</span>
                </div>
                <div className={`flex justify-between ${getStepColor(4)}`}>
                  <span>{getStepIcon(4)} CHAR_SYNC</span>
                  <span>{getStepStatus(4)}</span>
                </div>
                <div className={`flex justify-between ${getStepColor(5)}`}>
                  <span>{getStepIcon(5)} INTERFACE_PREP</span>
                  <span>{getStepStatus(5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Character stats preview */}
          {state.character && (
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-xs text-muted-foreground font-mono">
                <div className="text-primary text-xs font-bold mb-2">[STATUS]</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-muted-foreground">HEALTH</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">{state.character.energy}/100</div>
                    <div className="text-muted-foreground">ENERGY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">{state.character.coins}</div>
                    <div className="text-muted-foreground">SHARD</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-3 mt-4">
          GAME_LOADER_v2089 | WASTELAND_ENTRY_PROTOCOL
        </div>
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }: { error?: string, onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-background border border-red-500/50 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-red-500/30 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-red-500 font-bold text-sm">ERROR_HANDLER v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs">CRITICAL</span>
          </div>
        </div>

        {/* Error Display */}
        <div className="bg-red-950/20 border border-red-500/30 rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-red-500 text-2xl mb-2">💥</div>
            <div className="text-red-500 font-bold mb-1">SYSTEM_MALFUNCTION</div>
            <div className="text-red-400 text-xs break-words">
              {error || 'UNKNOWN_ERROR_DETECTED'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-mono text-sm"
          >
            <Terminal className="w-4 h-4 mr-2" />
            RETRY_CONNECTION
          </Button>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-950/20 font-mono text-sm"
          >
            EMERGENCY_RESTART
          </Button>
        </div>

        {/* Footer */}
        <div className="text-xs text-red-400/60 font-mono text-center border-t border-red-500/20 pt-3 mt-4">
          ERROR_HANDLER_v2089 | DIAGNOSTIC_MODE
        </div>
      </div>
    </div>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center font-mono">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
