/** The heading block shared by the three main pages, so they line up exactly. */
export function PageTitle({ title, children, aside }: { title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
      <div className="min-w-0">
        <h1 className="font-display text-[2.6rem] font-bold leading-none tracking-tight sm:text-6xl">{title}</h1>
        {children && <p className="mt-2.5 text-[17px] text-ink-soft">{children}</p>}
      </div>
      {aside}
    </section>
  );
}
