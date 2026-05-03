import { GDPRIcon } from "@/components/ui/icons";
import { T } from "gt-next";
import Link from "next/link";

function Footer() {
    return (
        <footer>
            <div className="relative mx-auto mt-auto grid h-auto w-full grid-cols-12 gap-x-[min(2.25vw,32px)] pt-[120px] lg:top-0">
                <div className="relative z-20 col-span-full mx-auto grid w-full grid-cols-12 flex-col gap-6 gap-x-[min(2.25vw,32px)] pb-4! md:pb-6! lg:mb-20 lg:py-8 lg:pb-8!">
                    <div className="col-span-full flex flex-col gap-4">
                        <div className="col-span-full flex h-full flex-row flex-wrap gap-6 text-[#0A0B0D] text-[0.8rem] leading-[1.22] tracking-[-3%]">
                            <div className="flex flex-row flex-wrap gap-6 [&:has(a:hover,a:focus-visible)_a:focus-visible]:opacity-100 [&:has(a:hover,a:focus-visible)_a:hover]:opacity-100 [&:has(a:hover,a:focus-visible)_a]:opacity-25 [&_a:focus-visible]:opacity-100 [&_a:hover]:opacity-100 [&_a]:opacity-50 [&_a]:transition-opacity [&_a]:duration-300">
                                <Link
                                    className="underline"
                                    href="/manifesto"
                                    target="_blank"
                                >
                                    <T>
                                        <p>Manifesto</p>
                                    </T>
                                </Link>
                                <Link
                                    className="underline"
                                    href="/legal/terms-of-service"
                                    target="_blank"
                                >
                                    <T>
                                        <p>Terms of Service</p>
                                    </T>
                                </Link>
                                <Link
                                    className="underline"
                                    href="/legal/privacy-policy"
                                    target="_blank"
                                >
                                    <T>
                                        <p>Privacy Policy</p>
                                    </T>
                                </Link>
                                <Link
                                    className="underline"
                                    href="/legal/cookie-policy"
                                    target="_blank"
                                >
                                    <T>
                                        <p>Cookie Policy</p>
                                    </T>
                                </Link>
                                <Link
                                    className="underline"
                                    href="/security"
                                    target="_blank"
                                >
                                    <T>
                                        <p>Security</p>
                                    </T>
                                </Link>
                                <Link
                                    className="underline"
                                    href="https://x.com/gsmmtt"
                                    rel="noreferrer noopener"
                                    target="_blank"
                                >
                                    <p>X</p>
                                </Link>
                            </div>
                            <p className="opacity-50">
                                &copy; Cache. All rights reserved.
                            </p>
                            <GDPRIcon className="opacity-50" />
                        </div>
                    </div>
                    <div className="relative col-span-full flex flex-col items-start justify-between font-sans text-[#0A0B0D] text-xs leading-[1.22] tracking-[-3%] opacity-50">
                        <span className="opacity-90">
                            <T context="Disclaimer">
                                *Third-party platforms you connect through the
                                Service are operated independently of Cache.
                                Cache does not control their policies or how
                                they apply them, and is not responsible for
                                decisions those platforms make regarding your
                                accounts or access to their services—including,
                                without limitation, changes to
                                availability—whether or not related to your use
                                of Cache. You are responsible for complying with
                                each platform's terms, policies, and community
                                guidelines. Cache is not liable for any
                                inconvenience, loss, or other outcome arising
                                from your relationship with those platforms or
                                your use of the Service in connection with them.
                                Additional detail may be found
                            </T>
                        </span>
                        <div className="inset-x-0 -my-8 h-[200px] w-full overflow-clip">
                            <svg
                                aria-hidden
                                aria-label="Branding"
                                className="overflow-fade-bottom mx-auto flex h-auto w-full justify-center"
                                fill="none"
                                height="200"
                                role="presentation"
                                viewBox="0 0 426 200"
                                width="426"
                            >
                                <rect
                                    className="origin-top transition-transform duration-300 hover:scale-95"
                                    fill="black"
                                    height="100"
                                    rx="30"
                                    width="100"
                                    y="50"
                                />
                                <rect
                                    className="origin-top transition-transform duration-300 hover:scale-95"
                                    fill="black"
                                    height="100"
                                    rx="48"
                                    width="100"
                                    x="108.667"
                                    y="50"
                                />
                                <rect
                                    className="origin-top transition-transform duration-300 hover:scale-95"
                                    fill="black"
                                    height="100"
                                    rx="28"
                                    width="100"
                                    x="217.333"
                                    y="50"
                                />
                                <rect
                                    className="origin-top transition-transform duration-300 hover:scale-95"
                                    fill="black"
                                    height="100"
                                    rx="38"
                                    width="100"
                                    x="326"
                                    y="50"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export { Footer };
