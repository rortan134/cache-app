import type { ClassValue } from "clsx";
import { clsx, twMerge } from "cnfast";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
