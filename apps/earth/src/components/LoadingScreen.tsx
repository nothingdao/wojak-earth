// src/components/LoadingScreen.tsx
import React from 'react'
import { Earth } from 'lucide-react'

interface LoadingScreenProps {
  title?: string
  subtitle?: string
  showSpinner?: boolean
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = "Loading...",
  subtitle,
  showSpinner = true
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {showSpinner && (
          <Earth className="w-8 h-8 mb-4 animate-spin mx-auto text-primary" />
        )}
        <div className="text-lg font-medium">{title}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground mt-2">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
