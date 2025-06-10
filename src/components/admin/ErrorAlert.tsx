// src/components/admin/ErrorAlert.tsx
import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorAlertProps {
  title: string
  error: string
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ title, error }) => (
  <div className="bg-red-950/20 border border-red-500/30 rounded p-2">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-3 w-3 text-red-500" />
      <span className="text-red-500 text-xs font-mono font-bold">{title}</span>
    </div>
    <div className="text-red-400 text-xs font-mono mt-1">{error}</div>
  </div>
)
