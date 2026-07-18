type SearchFormProps = {
  defaultValue?: string;
  action?: string;
};

export function SearchForm({ defaultValue = "", action = "/search" }: SearchFormProps) {
  return (
    <form action={action} className="flex w-full flex-col gap-3 sm:flex-row">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search part number, brand, or product"
        className="min-h-12 flex-1 rounded border border-zinc-300 bg-white px-4 text-base font-semibold text-zinc-950 outline-none transition placeholder:font-medium placeholder:text-zinc-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20"
      />
      <button
        type="submit"
        className="min-h-12 rounded bg-red-700 px-6 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-800"
      >
        Search
      </button>
    </form>
  );
}
