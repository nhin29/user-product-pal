import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  priority?: boolean;
  width?: number;
  height?: number;
}

/**
 * Optimized image component with:
 * - Lazy loading (IntersectionObserver)
 * - Blur-up placeholder effect
 * - Supabase image transformation for thumbnails
 */
export function OptimizedImage({
  src,
  alt = "",
  className,
  aspectRatio = "auto",
  priority = false,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px",
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Generate optimized URL for Supabase Storage images
  const getOptimizedUrl = (url: string, size: number = 800) => {
    if (url.includes("supabase.co/storage/v1/object/public/")) {
      const transformed = url.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      return `${transformed}?width=${size}&height=${size}&resize=cover&quality=85`;
    }
    return url;
  };

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  };

  const thumbnailUrl = getOptimizedUrl(src, width || 800);

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden",
        aspectClasses[aspectRatio],
        className
      )}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted rounded-lg" />
      )}

      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={thumbnailUrl}
          alt={alt}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "relative z-10 h-full w-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
}

export default OptimizedImage;
