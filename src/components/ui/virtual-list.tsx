import { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => ReactNode;
    overscan?: number;
    className?: string;
}

export function VirtualList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 3,
    className,
}: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalHeight = items.length * itemHeight;

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn("overflow-auto", className)}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: "relative" }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div
                            key={startIndex + index}
                            style={{ height: itemHeight }}
                        >
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Alternative simpler infinite scroll
interface InfiniteScrollProps {
    children: ReactNode;
    loadMore: () => void;
    hasMore: boolean;
    isLoading?: boolean;
    threshold?: number;
    className?: string;
}

export function InfiniteScroll({
    children,
    loadMore,
    hasMore,
    isLoading,
    threshold = 100,
    className,
}: InfiniteScrollProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (isLoading || !hasMore) return;

            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < threshold) {
                loadMore();
            }
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [hasMore, isLoading, loadMore, threshold]);

    return (
        <div ref={containerRef} className={cn("overflow-auto", className)}>
            {children}
            {isLoading && (
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
            )}
        </div>
    );
}
