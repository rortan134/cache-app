import { SignInButton } from "@/components/auth/sign-in-button";
import { getServerSession } from "@/lib/auth/session";

export const instant = false;

export default async function SignInPage() {
    const session = await getServerSession();

    return (
        <div className="flex min-h-dvh max-w-md flex-col items-center justify-center">
            <SignInButton hasServerSession={!!session} />
        </div>
    );
}
