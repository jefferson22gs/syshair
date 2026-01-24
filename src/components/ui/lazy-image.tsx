import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholderClassName?: string;
    width?: number;
    height?: number;
    objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export function LazyImage({
    src,
    alt,
    className,
    placeholderClassName,
    width,
    height,
    objectFit = "cover",
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "100px" }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={imgRef}
            className={cn("relative overflow-hidden bg-muted", className)}
            style={{ width, height }}
        >
            {/* Placeholder with shimmer effect */}
            {!isLoaded && (
                <div
                    className={cn(
                        "absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]",
                        placeholderClassName
                    )}
                    style={{
                        animation: "shimmer 1.5s infinite",
                    }}
                />
            )}

            {/* Error state */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground">Erro ao carregar</span>
                </div>
            )}

            {/* Actual image */}
            {isInView && !error && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setError(true)}
                    className={cn(
                        "w-full h-full transition-opacity duration-300",
                        isLoaded ? "opacity-100" : "opacity-0"
                    )}
                    style={{ objectFit }}
                />
            )}
        </div>
    );
}

// Gallery variant with lightbox support
interface GalleryImageProps extends LazyImageProps {
    onClick?: () => void;
}

export function GalleryImage({ onClick, ...props }: GalleryImageProps) {
    return (
        <button
            onClick={onClick}
            className="relative group cursor-pointer"
        >
            <LazyImage {...props} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    🔍
                </span>
            </div>
        </button>
    );
}
