import { cn } from "@/lib/cn";
export function LoadingSkeleton({ className = "h-24" }: { className?: string }) { return <div className={cn("skeleton veyro-skeleton", className)} aria-hidden="true" />; }
