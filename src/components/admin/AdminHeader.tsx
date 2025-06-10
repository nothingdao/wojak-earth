// src/components/admin/AdminHeader.tsx
import React from 'react'
import { Shield, Signal } from 'lucide-react'

interface AdminHeaderProps {
  version?: string
  lastUpdate?: string
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  version = "v2.089",
  lastUpdate = "2_MIN_AGO"
}) => {
  return (
    <div className="bg-background border border-primary/30 border-t-0 border-x-0">
      <div className="flex items-center justify-between p-3 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-primary font-bold text-sm font-mono">
            EARTH_ADMIN_CONSOLE {version}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Signal className="w-3 h-3 animate-pulse" />
            <span>LAST_UPDATE: {lastUpdate}</span>
          </div>
          <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs">
            A
          </div>
        </div>
      </div>
    </div>
  )
}
