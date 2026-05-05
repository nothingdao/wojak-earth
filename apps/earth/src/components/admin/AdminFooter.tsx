// =============================================================================
// src/components/admin/AdminFooter.tsx
import React from 'react'

interface AdminFooterProps {
  version?: string
}

export const AdminFooter: React.FC<AdminFooterProps> = ({ version = "v2089" }) => (
  <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
    ADMIN_CONSOLE_{version} | {new Date().toLocaleTimeString()} | AUTHORIZATION_LEVEL_OMEGA
  </div>
)
