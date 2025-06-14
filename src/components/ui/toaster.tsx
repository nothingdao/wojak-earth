import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '@/components/theme-provider'

export function Toaster() {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark'}
      position="top-left"
      expand={true}
      richColors={false}
      closeButton={false}
      className="font-mono"
      toastOptions={{
        style: {
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
          fontSize: '13px',
          padding: '12px 16px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--background)',
          color: 'var(--foreground)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        classNames: {
          toast: 'font-mono',
          title: 'font-bold text-sm mb-1 text-foreground',
          description: 'text-xs text-muted-foreground mt-1',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
          success: 'border-l-4 border-success',
          error: 'border-l-4 border-destructive',
          warning: 'border-l-4 border-warning',
          info: 'border-l-4 border-primary',
        }
      }}
    />
  )
} 
