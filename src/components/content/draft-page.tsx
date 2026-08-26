import type { ReactNode } from "react";

export function DraftPage({
  eyebrow = "Review draft",
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-zinc-50">
      <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="border border-zinc-200 bg-white p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-700">{intro}</p>
          <div className="mt-10 grid gap-8 text-sm leading-7 text-zinc-700">
            {children}
          </div>
          <div className="mt-10 border-t border-yellow-200 bg-yellow-50 px-4 py-4 text-sm leading-6 text-yellow-950">
            <strong>Draft for professional review:</strong> This page is being
            prepared for review by Mustang Magic&apos;s New York counsel before
            publication. It is not final legal or business policy.
          </div>
        </div>
      </div>
    </main>
  );
}

export function DraftSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-tight text-zinc-950">
        {title}
      </h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}
