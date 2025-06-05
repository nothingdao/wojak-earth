// src/components/views/AdminView.tsx - Create the admin view component
import { useWallet } from '@solana/wallet-adapter-react'
import { isAdmin } from '@/config/admins'
import AdminDashboard from '@/components/admin/AdminDashboard'
import type { Character } from '@/types'
interface AdminViewProps {
  character: Character
}
import { Profiler } from 'react'


function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  if (actualDuration > 16) { // Flag slow renders (60fps = 16ms budget)
    console.warn(`Slow render: ${id} took ${actualDuration}ms`)
  }
}

export function AdminView({ character }: AdminViewProps) {
  const wallet = useWallet()

  // Check if user is admin
  if (!wallet.publicKey || !isAdmin(wallet.publicKey.toString())) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have admin privileges.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none -mx-4"> {/* Break out of mobile container */}
      <Profiler id="AdminDashboard" onRender={onRender}>
        <AdminDashboard />
      </Profiler>
    </div>
  )
}
