import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  width?: number;
  height?: number;
}

/**
 * Appends Supabase storage transform params for resizing.
 * Only applies to Supabase storage URLs.
 */
function getOptimizedUrl(src: string, width?: number, height?: number): string {
  if (!src) return src;
  // Only transform Supabase storage URLs
  if (src.includes("supabase.co/storage/v1/object/public/")) {
    const url = new URL(src);
    if (width) url.searchParams.set("width", String(width));
    if (height) url.searchParams.set("height", String(height));
    url.searchParams.set("quality", "60");
    return url.toString();
  }
  return src;
}

export function OptimizedImage({
  src,
  width,
  height,
  className,
  alt,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const optimizedSrc = getOptimizedUrl(src, width, height);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted rounded-lg" />
      )}
      <img
        src={optimizedSrc}
        alt={alt || ""}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
