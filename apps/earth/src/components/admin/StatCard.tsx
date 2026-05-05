// src/components/admin/StatCard.tsx
import React from 'react'
import { Loader2 } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  icon: LucideIcon
  loading?: boolean
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  loading = false
}) => (
  <div className="bg-muted/30 border border-primary/20 rounded p-3">
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground font-mono mb-1">
          {title.toUpperCase()}
        </div>
        {loading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-mono">SCANNING...</span>
          </div>
        ) : (
          <>
            <div className="text-primary font-bold font-mono">{value.toLocaleString()}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground font-mono">
                {subtitle.toUpperCase()}
              </div>
            )}
          </>
        )}
      </div>
      <Icon className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
    </div>
  </div>
)
