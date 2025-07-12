"use client"

import { useFormStatus } from "react-dom"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type Props = ComponentProps<"button"> & {
  pendingText?: string
}

export function SubmitButton({ children, pendingText, className, ...props }: Props) {
  const { pending, action } = useFormStatus()

  const isPending = pending && action === props.formAction

  return (
    <button {...props} type="submit" aria-disabled={pending} className={cn(className)}>
      {isPending ? pendingText : children}
    </button>
  )
}
