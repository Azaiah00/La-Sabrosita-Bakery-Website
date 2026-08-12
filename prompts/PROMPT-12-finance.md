# PROMPT 12 — Admin: daily sales, expenses, P&L and the owner dashboard

> Requires PROMPT 01–11. Read `DESIGN.md` §6 and the dataviz rules in §5 below before writing chart code.

---

## Goal

Close the loop. Money in, money out, what it cost to make, and what is left — on one screen, in plain Spanish, accurate enough to hand to an accountant.

## Files to create

```
src/app/admin/page.tsx                    # owner dashboard
src/app/admin/ventas/page.tsx
src/app/admin/ventas/[date]/page.tsx      # daily close
src/app/admin/gastos/page.tsx
src/app/admin/gastos/nuevo/page.tsx
src/app/admin/nomina/page.tsx
src/app/admin/reportes/page.tsx
src/app/admin/reportes/pyg/page.tsx       # P&L
src/components/admin/daily-close-form.tsx
src/components/admin/expense-form.tsx
src/components/admin/pnl-table.tsx
src/components/admin/kpi-tile.tsx
src/components/admin/trend-chart.tsx
src/components/admin/commission-saved-card.tsx
src/lib/admin/reporting.ts
src/app/actions/finance.ts
```

---

## 1. `/admin/ventas/[date]` — Daily close

The screen someone fills in at 8:05 PM with the drawer open. It must take under two minutes.

Fields:

| Field | Source |
|---|---|
| Ventas brutas | manual, or imported from POS later |
| Impuesto cobrado | auto = gross × `businesses.tax_rate`, overridable |
| Efectivo esperado | manual |
| Efectivo contado | manual |
| **Diferencia** | computed, live, `--danger` beyond ±$5 |
| Tarjeta | manual |
| Pedidos en línea | **auto-computed** from confirmed `orders` for that business date |
| Mayoreo | auto from invoices issued that date |
| DoorDash / Grubhub | manual |
| Comisión de plataformas | manual |
| Transacciones | manual |
| Nota | free text |

Rules:

- One row per location per date, enforced by the unique constraint. Re-opening a closed day requires manager role and writes an `audit_log` row.
- The "business date" is computed in `America/New_York`, so a sale rung at 12:15 AM belongs to the day that just ended if the client says so — make that a `settings` value (`business_day_cutoff`, default `00:00`).
- Big number pad-friendly inputs. `inputMode="decimal"`. Tab order follows the drawer count, not the DOM order you happened to write.

## 2. `/admin/gastos` — Expenses

List with filters (category, date range, vendor, method) and a running total. New-expense form: date, category, vendor (optional), amount, method, description, receipt image, recurring toggle.

- Receipt upload goes to a private Supabase Storage bucket, served to admins via signed URL. Same MIME sniffing and EXIF stripping as the cake reference photos.
- Recurring expenses (rent, insurance) generate the next month's draft automatically via the cron in PROMPT 14; a draft is never posted without review.
- Expenses created automatically from received POs are visible here, flagged as PO-linked, and cannot be edited from this screen — edit the PO instead, so the two never disagree.

## 3. `/admin/nomina` — Labor

Weekly entry: period start/end, total hours, gross wages, payroll taxes, headcount. Feeds `labor_costs` and the labor % on the P&L. Deliberately simple — this is not a payroll system and must not pretend to be one. A note on the screen says exactly that.

## 4. `/admin/reportes/pyg` — Profit & loss

Straight from `v_pnl_monthly`, months as columns, with a trailing-12 column:

```
                       May      Jun      Jul      Ago
Ingresos            39,127   66,835   68,899   25,046
  Costo de insumos  11,190   22,438   17,914    5,630
  Mano de obra      17,800   17,800   17,800   17,800
  Gastos operativos 10,470   10,470   10,470   10,470
  Comisiones            —        —        —        —
────────────────────────────────────────────────────
Utilidad bruta      27,937   44,397   50,985   19,416
Utilidad neta         -627   15,626   22,198   -9,042

Costo de insumos %   28.6%    33.6%    26.0%    22.5%
Mano de obra %       45.5%    26.6%    25.8%    71.1%
Costo primo %        74.1%    60.2%    51.8%    93.6%
```

- Every figure `tabular-nums`, right-aligned, negatives in `--danger` with a minus sign — never parentheses, which read as a typo to a non-accountant.
- **Partial months are labelled as partial.** A month with 11 days of data will show a loss and that is arithmetic, not a business problem. Put "mes parcial" under the header so nobody panics.
- Benchmarks shown inline as a quiet reference band: food cost 25–35%, labor 25–35%, prime cost under 60–65% is healthy for an independent bakery. Present these as industry rules of thumb, not as a diagnosis of this business.
- CSV and print export. The print stylesheet is what goes to the accountant.

## 5. `/admin` — The owner dashboard

Read `dataviz` skill guidance before writing chart code if it is available; otherwise follow these rules.

**Row 1 — six KPI tiles**, period-selectable (7d / 30d / 90d / YTD), each with a delta against the prior equal period:

Ventas · Utilidad neta · Costo de insumos % · Mano de obra % · Ticket promedio · Merma ($)

**Row 2 — trends.** Sales by day (bar), with a 7-day moving average line. Food cost % over time (line) with the 25–35% band shaded.

**Row 3 — mix.** Sales by channel (mostrador · en línea · mayoreo · plataformas) as a stacked area. Top 10 products by contribution margin as a horizontal bar.

**Row 4 — `commission-saved-card.tsx`.** From `v_commission_saved`:

> **Ahorrado en comisiones este mes: $1,320**
> $6,015 en pedidos directos. En DoorDash habrías pagado ~$1,504 en comisión. En Stripe pagaste $183.
> *Estimado con una comisión de 25%. Confirma la tasa real en tu estado de cuenta.*

**This is the number that renews the retainer every year.** Give it a full-width card and a running annual total. And state the assumption honestly on the card — a savings figure the owner cannot verify is worth nothing.

### Chart rules

- One categorical palette derived from the brand tokens. `--accent` for the primary series; neutrals from the wheat/ink range for the rest. **No default Recharts colors, no rainbow.**
- Every chart legible in both light and dark; test both.
- Axis labels and tooltips in the active locale, currency formatted with `Intl.NumberFormat`.
- Never a pie chart with more than four slices.
- Every chart has an accessible text alternative: a visually-hidden table with the same data, so the dashboard is usable by screen reader.
- No chart animation longer than 400ms, and none at all under reduced motion.

## 6. `src/lib/admin/reporting.ts`

All aggregation runs in Postgres through the views. TypeScript formats; it does not compute.

```ts
export async function getKpis(businessId: string, period: Period): Promise<Kpis>
export async function getPnl(businessId: string, months: number): Promise<PnlRow[]>
export async function getSalesByChannel(...): Promise<ChannelRow[]>
export async function getCommissionSaved(...): Promise<SavedRow[]>
export async function getTopProductsByMargin(...): Promise<MarginRow[]>
export async function exportCsv(report: ReportKey, params: object): Promise<string>
```

Every CSV export writes a UTF-8 BOM so accents survive Excel.

## Acceptance criteria

- [ ] P&L figures reconcile: for one month, hand-sum `sales_days.gross_sales` and every `expenses.amount`, and confirm the view matches to the cent.
- [ ] Food cost %, labor % and prime cost % are arithmetically correct against those same hand sums.
- [ ] Partial months are labelled and do not silently read as a collapse.
- [ ] Daily close: cash variance computes live and flags beyond ±$5.
- [ ] "Pedidos en línea" auto-populates from confirmed orders for that business date, in `America/New_York` — verify with an order placed at 11:50 PM.
- [ ] Re-opening a closed day requires manager role and writes an `audit_log` row.
- [ ] A received PO produces exactly one expense, visible here, not editable here.
- [ ] Recurring expenses generate a **draft**, never a posted row.
- [ ] Commission-saved math is correct and its assumption is stated on the card.
- [ ] Every chart renders correctly in light and dark, with brand colors and no library defaults.
- [ ] Every chart has a visually-hidden data table; verify with a screen reader.
- [ ] CSV exports open in Excel with `Quesadilla Salvadoreña` intact.
- [ ] The P&L print stylesheet produces a clean single-page-per-quarter sheet.
- [ ] **RLS:** only `manager` and `owner` can read `sales_days`, `expenses`, `labor_costs`. A `counter` account returns 0 rows. Prove it.
- [ ] Every number `tabular-nums`.
- [ ] Both locales, Spanish first, and the Spanish reads naturally.

## What NOT to do

- Do not compute financial aggregates in TypeScript. Postgres owns the math.
- Do not use parentheses for negative numbers.
- Do not present industry benchmarks as a verdict on this business.
- Do not show a commission-savings figure without stating the assumed rate.
- Do not let an automatic expense be edited in two places.
- Do not use default chart library colors.
- Do not ship a chart with no text alternative.
- Do not call this a payroll system, an accounting system, or a POS. It is a management-reporting layer, and the screens should say so where it matters.
