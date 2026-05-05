import { toast as sonnerToast, type ExternalToast } from 'sonner'
import {
  type ReactNode,
  type ReactElement,
  type JSXElementConstructor,
} from 'react'
import { Toast } from './toast'

export interface ToastAction {
  label: string
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export interface ToastCancel {
  label: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export interface ToastOptions {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  title?: string
  description?: string
  action?: ToastAction
  cancel?: ToastCancel
  icon?: ReactNode
  className?: string
  style?: React.CSSProperties
  duration?: number
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center'
  closeButton?: boolean
  dismissible?: boolean
  important?: boolean
  unstyled?: boolean
  richColors?: boolean
  toastId?: string | number
  onDismiss?: (toast: { id: string | number }) => void
  onAutoClose?: (toast: { id: string | number }) => void
}

export interface ToastProps extends ToastOptions {
  message: ReactNode
}

export type ToastRenderFunction = (
  id: string | number
) => ReactElement<unknown, string | JSXElementConstructor<unknown>>

// Convenience methods
export const toast = Object.assign(Toast, {
  success: (message: ReactNode, options?: Omit<ToastOptions, 'variant'>) =>
    Toast({ message, variant: 'success', ...options }),

  error: (message: ReactNode, options?: Omit<ToastOptions, 'variant'>) =>
    Toast({ message, variant: 'error', ...options }),

  warning: (message: ReactNode, options?: Omit<ToastOptions, 'variant'>) =>
    Toast({ message, variant: 'warning', ...options }),

  info: (message: ReactNode, options?: Omit<ToastOptions, 'variant'>) =>
    Toast({ message, variant: 'info', ...options }),

  persistent: (message: ReactNode, options?: ToastOptions) =>
    Toast({ message, duration: Infinity, closeButton: true, ...options }),

  quick: (message: ReactNode, options?: ToastOptions) =>
    Toast({ message, duration: 1500, ...options }),

  loading: (message: ReactNode, options?: ToastOptions) =>
    Toast({
      message,
      icon: '⟳',
      duration: Infinity,
      closeButton: false,
      dismissible: false,
      ...options,
    }),

  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  dismissAll: () => sonnerToast.dismiss(),

  custom: (render: ToastRenderFunction, options?: ExternalToast) =>
    sonnerToast.custom(render, {
      className: 'font-mono',
      style: {
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
      },
      ...options,
    }),
})

export function useToast() {
  return {
    toast,
    dismiss: toast.dismiss,
    dismissAll: toast.dismissAll,
  }
}
