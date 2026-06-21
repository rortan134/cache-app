import { clsx, twMerge, type ClassValue } from "cnfast";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
