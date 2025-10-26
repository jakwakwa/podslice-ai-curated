import type React from "react";
import { cn } from "@/lib/utils";

interface AboutSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export default function AboutSection({
    title,
    children,
    className,
}: AboutSectionProps) {
    return (
        <section className={cn("py-16 md:py-24 px-4", className)}>
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-12">
                    {title}
                </h2>
                {children}
            </div>
        </section>
    );
}

