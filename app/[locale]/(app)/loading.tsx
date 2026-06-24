import { BrandLogo } from "@/components/ui/brand-logo";
import LogoIconImage from "@/public/cache-app-icon.png";

export default function LoadingPage() {
    return (
        <div className="absolute inset-0 flex flex-[1_1_0] items-center justify-center">
            <BrandLogo
                className="m-auto opacity-70 grayscale"
                src={LogoIconImage}
            />
        </div>
    );
}
