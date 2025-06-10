// src/components/admin/LoadingSpinner.tsx
import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "LOADING..."
}) => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
    <span className="text-muted-foreground font-mono text-xs">{message}</span>
  </div>
)
