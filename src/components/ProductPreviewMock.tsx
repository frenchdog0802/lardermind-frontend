const WEEK_PLAN = [
  { day: 'Mon', meal: 'Lemon garlic chicken + rice' },
  { day: 'Tue', meal: 'Veggie fried rice (use leftovers)' },
  { day: 'Wed', meal: 'Tomato pasta' },
  { day: 'Thu', meal: 'Sheet-pan salmon' },
  { day: 'Fri', meal: 'Tacos from pantry beans' },
  { day: 'Sat', meal: 'Stir-fry night' },
  { day: 'Sun', meal: 'Soup + leftover bread' },
] as const;

const GROCERY_ITEMS = [
  { name: 'Chicken thighs', qty: '1 pack', checked: false },
  { name: 'Lemons', qty: '2', checked: false },
  { name: 'Garlic', qty: '1 bulb', checked: true },
  { name: 'Pasta', qty: '500g', checked: false },
  { name: 'Salmon fillets', qty: '2', checked: false },
  { name: 'Tortillas', qty: '1 pack', checked: false },
  { name: 'Baby spinach', qty: '1 bag', checked: true },
] as const;

export function ProductPreviewMock() {
  return (
    <section id="product-preview" className="border-t border-line bg-surface/60 px-[5%] py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-herb">Product preview</p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
            A real week of dinners — and only what you still need
          </h2>
          <p className="mt-3 text-lg text-muted">
            Plan from your pantry, then shop the gaps. Same Warm Kitchen screens you use in the app.
          </p>
        </div>

        <figure className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-line bg-linen shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2 border-b border-line bg-sage/40 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" aria-hidden="true" />
              <span className="ml-2 text-xs font-medium text-muted">LarderMind · Calendar &amp; Shopping</span>
            </div>

            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-line p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">This week</h3>
                  <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
                    Dinner plan
                  </span>
                </div>
                <ul className="space-y-2">
                  {WEEK_PLAN.map((row) => (
                    <li
                      key={row.day}
                      className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                    >
                      <span className="w-9 shrink-0 text-sm font-semibold text-herb">{row.day}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{row.meal}</p>
                        <p className="mt-0.5 text-xs text-muted">Dinner</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink">Shopping list</h3>
                  <span className="text-xs font-medium text-muted">
                    {GROCERY_ITEMS.filter((i) => !i.checked).length} left
                  </span>
                </div>
                <ul className="space-y-2">
                  {GROCERY_ITEMS.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          item.checked
                            ? 'border-herb bg-herb text-white'
                            : 'border-line bg-linen'
                        }`}
                        aria-hidden="true"
                      >
                        {item.checked ? (
                          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5 5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-medium ${
                            item.checked ? 'text-muted line-through' : 'text-ink'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span className="text-xs text-muted">{item.qty}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl border border-line bg-sage/30 px-3 py-2 text-xs text-herb-deep">
                  Built from this week&apos;s plan — only ingredients you don&apos;t already have.
                </p>
              </div>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-sm text-muted">
            Illustrative weekly plan and grocery list — the same loop in the live app.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
