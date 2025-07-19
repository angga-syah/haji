// components/ui/form.tsx
import React from 'react'
import { cn } from '@/lib/utils'

// Form Container
const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={cn('space-y-6', className)} {...props} />
  )
)
Form.displayName = 'Form'

// Form Field Container
const FormField = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  )
)
FormField.displayName = 'FormField'

// Form Label
const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
)
FormLabel.displayName = 'FormLabel'

// Form Control wrapper for form inputs
const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative', className)} {...props} />
  )
)
FormControl.displayName = 'FormControl'

// Form Description
const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)
FormDescription.displayName = 'FormDescription'

// Form Error Message
const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null
    
    return (
      <p
        ref={ref}
        className={cn('text-sm font-medium text-destructive', className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
FormMessage.displayName = 'FormMessage'

// Form Item - Complete form field with label, control, description, and error
interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  description?: string
  error?: string
  required?: boolean
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, label, description, error, required, children, ...props }, ref) => (
    <FormField ref={ref} className={className} {...props}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        {children}
      </FormControl>
      {description && !error && (
        <FormDescription>{description}</FormDescription>
      )}
      {error && <FormMessage>{error}</FormMessage>}
    </FormField>
  )
)
FormItem.displayName = 'FormItem'

// Form Section - For grouping related form fields
const FormSection = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  title?: string
  description?: string
}>(
  ({ className, title, description, children, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium leading-none">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
)
FormSection.displayName = 'FormSection'

// Form Actions - For submit buttons and form actions
const FormActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end space-x-2 pt-4 border-t',
        className
      )}
      {...props}
    />
  )
)
FormActions.displayName = 'FormActions'

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSection,
  FormActions
}