import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandMark({
  size = 34,
  label,
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return <Image
    src="/logo.png"
    width={size}
    height={size}
    loading="eager"
    alt={label ?? ""}
    aria-hidden={label ? undefined : true}
    className={cn("logo-mark", className)}
    style={{ width: size, height: size }}
  />;
}
