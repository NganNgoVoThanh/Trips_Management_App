import { cn } from "@/lib/utils"

interface AdminShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AdminShell({
  children,
  className,
  ...props
}: AdminShellProps) {
  return (
    <div className={cn("grid items-start gap-8", className)} {...props}>
      {children}
    </div>
  )
}
