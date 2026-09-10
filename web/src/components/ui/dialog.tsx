import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { closeLabel: string }

export const DialogContent = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, closeLabel, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content ref={ref} className={cn('dialog-content', className)} {...props}>
        <DialogPrimitive.Close className="button button-ghost button-icon reader-close" aria-label={closeLabel}>
          <X size={20} aria-hidden="true" />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
)
DialogContent.displayName = 'DialogContent'
