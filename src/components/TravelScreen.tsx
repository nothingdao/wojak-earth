// src/components/TravelScreen.tsx
import React, { useEffect, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import type { DatabaseLocation } from '@/types'

interface TravelScreenProps {
  destination: DatabaseLocation
  locations: DatabaseLocation[]
}

export const TravelScreen: React.FC<TravelScreenProps> = ({
  destination,
  locations
}) => {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Preparing for journey...')

  useEffect(() => {
    const steps = [
      'Preparing for journey...',
      'Packing supplies...',
      'Setting course...',
      `Traveling to ${destination.name}...`,
      'Almost there...',
      'Arriving...'
    ]

    let stepIndex = 0
    let progressValue = 0
    const totalDuration = 4000 // 4 seconds minimum
    const intervalDuration = 100 // Update every 100ms
    const totalSteps = totalDuration / intervalDuration
    const baseProgressPerStep = 100 / totalSteps

    const interval = setInterval(() => {
      // Add some randomness but keep it slower
      const randomVariation = (Math.random() - 0.5) * 0.5 // ±0.25% variation
      progressValue += baseProgressPerStep + randomVariation

      // Clamp progress to not exceed 100
      if (progressValue >= 100) {
        progressValue = 100
        setProgress(100)
        setCurrentStep('Arriving...')
        clearInterval(interval)
        return
      }

      setProgress(progressValue)

      // Update step based on progress, but ensure steps last reasonable time
      const targetStepIndex = Math.min(
        Math.floor((progressValue / 100) * (steps.length - 1)),
        steps.length - 1
      )

      if (targetStepIndex !== stepIndex && targetStepIndex < steps.length) {
        stepIndex = targetStepIndex
        setCurrentStep(steps[stepIndex])
      }
    }, intervalDuration)

    return () => clearInterval(interval)
  }, [destination.name])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto p-6">
        {/* Animated travel icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <MapPin className="w-8 h-8 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-white/20 rounded-full animate-ping" />
        </div>

        {/* Destination info */}
        <h2 className="text-2xl font-bold mb-2">Traveling</h2>
        <p className="text-lg text-blue-200 mb-6">to {destination.name}</p>

        {/* Progress bar */}
        <div className="bg-white/10 rounded-full h-3 mb-4 overflow-hidden backdrop-blur-sm">
          <div
            className="bg-gradient-to-r from-blue-400 to-purple-400 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current step */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          {currentStep}
        </div>

        {/* Progress percentage */}
        <div className="text-xs text-gray-400 mt-2">
          {Math.round(progress)}% complete
        </div>

        {/* Destination description if available */}
        {destination.description && (
          <div className="mt-6 text-sm text-gray-300 bg-white/5 rounded-lg p-4 backdrop-blur-sm">
            <p className="italic">"{destination.description}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
