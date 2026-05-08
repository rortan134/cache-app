"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";
import { A11y, Mousewheel, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

// Styles
import "swiper/css";
import "swiper/css/mousewheel";
import "swiper/css/pagination";
import "swiper/css/a11y";

interface CarouselProps extends React.ComponentProps<typeof Swiper> {
    slideClassName?: string;
}

export function Carousel({
    children,
    className,
    grabCursor = true,
    slideClassName,
    slidesPerView = "auto",
    ...props
}: CarouselProps) {
    return (
        <Swiper
            className={cn("relative size-full", className)}
            grabCursor={grabCursor}
            modules={[Pagination, Mousewheel, A11y]}
            mousewheel={{ forceToAxis: true, sensitivity: 3 }}
            pagination={{
                bulletClass: "swiper-pagination-bullet",
                clickable: true,
                dynamicBullets: true,
                enabled: true,
                renderBullet: (_index, className) =>
                    `<span class="${className} inline-block size-2 rounded-full bg-foreground/40 transition-all opacity-50 mx-0.5 scale-75 cursor-pointer [&.swiper-pagination-bullet-active]:!bg-foreground [&.swiper-pagination-bullet-active]:!opacity-100 [&.swiper-pagination-bullet-active]:!scale-100"></span>`,
            }}
            slidesPerGroup={
                typeof slidesPerView === "number" ? slidesPerView : undefined
            }
            slidesPerView={slidesPerView}
            threshold={0}
            touchReleaseOnEdges={true}
            touchStartForcePreventDefault={true}
            {...props}
        >
            {React.Children.map(children, (child) => (
                <SwiperSlide className={slideClassName}>{child}</SwiperSlide>
            ))}
        </Swiper>
    );
}
