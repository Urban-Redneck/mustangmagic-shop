type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
        {description}
      </p>
    </div>
  );
}
