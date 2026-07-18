import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function VeyroCard({ className, raised = false, ...props }: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return <div className={cn("veyro-card", raised && "veyro-card-raised", className)} {...props}/>;
}
