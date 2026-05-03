"use client";

import { cn } from "@/lib/common/cn";
import * as React from "react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/mousewheel";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { FreeMode, Mousewheel, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { SwiperModule } from "swiper/types";

interface SupportedModules {
    freeMode?: boolean;
    navigation?: boolean;
    pagination?: boolean;
}

interface CarouselProps
    extends Omit<
            React.ComponentPropsWithRef<typeof Swiper>,
            keyof SupportedModules
        >,
        SupportedModules {
    slideClassName?: string;
}

const Carousel = ({
    children,
    className,
    freeMode = false,
    grabCursor = true,
    navigation = false,
    pagination = true,
    slideClassName,
    slidesPerView = "auto",
    ...props
}: CarouselProps) => {
    const modules: SwiperModule[] = [Mousewheel];
    if (freeMode) {
        modules.push(FreeMode);
    }
    if (navigation) {
        modules.push(Navigation);
    }
    if (pagination) {
        modules.push(Pagination);
    }

    return (
        <Swiper
            className={cn("relative size-full", className)}
            freeMode={{
                enabled: freeMode,
                momentumBounce: false,
                sticky: false,
            }}
            grabCursor={grabCursor}
            modules={modules}
            mousewheel={{ forceToAxis: true, sensitivity: 3 }}
            pagination={{
                bulletClass: "swiper-pagination-bullet",
                clickable: true,
                dynamicBullets: true,
                enabled: pagination,
                renderBullet: (_index, className) =>
                    `<span class="${className} inline-block size-2 rounded-full bg-foreground/40 transition-all opacity-50 mx-0.5 scale-75 cursor-pointer [&.swiper-pagination-bullet-active]:!bg-foreground [&.swiper-pagination-bullet-active]:!opacity-100 [&.swiper-pagination-bullet-active]:!scale-100"></span>`,
            }}
            slidesPerGroup={
                typeof slidesPerView === "number" ? slidesPerView : undefined
            }
            slidesPerView={slidesPerView}
            threshold={pagination ? 0 : undefined}
            touchReleaseOnEdges={pagination}
            touchStartForcePreventDefault={pagination}
            {...props}
        >
            {React.Children.map(children, (child) => (
                <SwiperSlide className={slideClassName}>{child}</SwiperSlide>
            ))}
        </Swiper>
    );
};

export { Carousel };
