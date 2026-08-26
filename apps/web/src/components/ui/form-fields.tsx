import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input placeholder:text-muted-foreground flex h-8 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1 text-[13px] outline-none transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-ring/60 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground flex min-h-16 w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-ring/60 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-[12.5px] font-medium text-muted-foreground select-none', className)}
      {...props}
    />
  );
}

export { Input, Label, Textarea };
