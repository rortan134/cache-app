export function Separator({ children = "or" }: React.PropsWithChildren) {
    return (
        <div className="my-3 flex shrink items-center justify-center gap-2">
            <div className="grow basis-0 border-neutral-200 border-b" />
            <span className="font-medium text-content-muted text-xs uppercase leading-none">
                {children}
            </span>
            <div className="grow basis-0 border-neutral-200 border-b" />
        </div>
    );
}
