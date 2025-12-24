import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface SkeletonCardProps {
    variant?: "card" | "list" | "table" | "stats";
    count?: number;
    className?: string;
}

export function SkeletonCard({ variant = "card", count = 1, className }: SkeletonCardProps) {
    const renderSkeleton = () => {
        switch (variant) {
            case "stats":
                return (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                );

            case "list":
                return (
                    <div className="flex items-center gap-4 p-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                );

            case "table":
                return (
                    <div className="flex items-center gap-4 p-4 border-b border-border">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                );

            case "card":
            default:
                return (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-14 w-14 rounded-full" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-3/4" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className={cn("space-y-4", className)}>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="glass-card rounded-xl overflow-hidden">
                    {renderSkeleton()}
                </div>
            ))}
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} variant="stats" />
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="glass-card rounded-xl p-6 space-y-4">
                        <Skeleton className="h-6 w-48 mb-4" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonCard key={i} variant="list" className="!space-y-0" />
                        ))}
                    </div>
                </div>
                <div className="glass-card rounded-xl p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonClientGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} variant="card" />
            ))}
        </div>
    );
}
