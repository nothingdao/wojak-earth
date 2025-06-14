// src/components/ui/toast.tsx
import { toast as sonnerToast, type ExternalToast } from 'sonner'
import { type ToastProps } from './use-toast'

export function Toast({
  message,
  variant = 'default',
  title,
  description,
  action,
  cancel,
  icon,
  duration = 4000,
  position = 'top-right',
  closeButton = true,
  dismissible = true,
  unstyled = false,
  richColors = false,
  className = '',
  style = {},
  onDismiss,
  onAutoClose,
  toastId
}: ToastProps) {
  // Build toast options compatible with Sonner
  const toastOptions: ExternalToast = {
    duration,
    position,
    closeButton,
    dismissible,
    unstyled,
    richColors,
    icon,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    cancel: cancel ? {
      label: cancel.label,
      onClick: cancel.onClick || (() => { })
    } : undefined,
    className: `font-mono ${variant} ${className}`,
    style: {
      ...style
    },
    onDismiss,
    onAutoClose,
    id: toastId,
  }

  // Format the message with title and description
  const formattedMessage = (
    <div>
      {title && <div className="font-bold text-sm mb-1">{title}</div>}
      <div>{message}</div>
      {description && <div className="text-xs text-muted-foreground mt-1">{description}</div>}
    </div>
  )

  return sonnerToast(formattedMessage, toastOptions)
}
