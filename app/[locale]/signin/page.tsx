import { SignInButton } from "@/components/auth/sign-in-button";
import { getServerSession } from "@/lib/auth/session";

export const instant = false;

export default async function SignInPage() {
    const session = await getServerSession();

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-1">
                <SignInButton hasServerSession={!!session} />
            </div>
        </div>
    );
}
