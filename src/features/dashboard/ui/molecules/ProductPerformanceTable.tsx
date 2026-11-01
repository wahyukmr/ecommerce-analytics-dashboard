import { memo, useMemo, useState } from "react";
import type { ProductPerformanceRow } from "../../application/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDisplayName,
} from "../../../../libs";
import { useLocale } from "../../../../context";
import SectionHeader from "./SectionHeader";
import { EmptyState, Icon } from "../atoms";

type SortKey = keyof Pick<
  ProductPerformanceRow,
  | "productName"
  | "category"
  | "views"
  | "uniqueViewers"
  | "addToCart"
  | "checkouts"
  | "purchases"
  | "revenue"
  | "purchaseRate"
>;

type Direction = "asc" | "desc";

const VIRTUALIZATION_THRESHOLD = 100;
const ROW_HEIGHT = 58;
const VIEWPORT_HEIGHT = 520;
const OVERSCAN_ROWS = 8;
const GRID_COLUMNS =
  "minmax(17rem, 2fr) minmax(6rem, .72fr) minmax(7rem, .8fr) minmax(6rem, .72fr) minmax(7rem, .78fr) minmax(7rem, .78fr) minmax(9rem, .95fr) minmax(6rem, .66fr)";

interface Props {
  readonly data: readonly ProductPerformanceRow[];
  readonly isPreparing?: boolean;
}

function ProductPerformanceTable({
  data,
  isPreparing = false,
}: Props): React.JSX.Element {
  const { workspaceLocale, workspaceCurrency } = useLocale();
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [direction, setDirection] = useState<Direction>("desc");

  const sorted = useMemo(() => {
    const rows = [...data];
    rows.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      const result = Number(aValue) - Number(bValue);
      return direction === "asc" ? result : -result;
    });
    return rows;
  }, [data, direction, sortKey]);

  function toggle(key: SortKey): void {
    if (sortKey === key) {
      setDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("desc");
  }

  return (
    <section
      id="catalog"
      className="section-anchor space-y-4"
      aria-labelledby="products-heading"
    >
      <SectionHeader
        id="products-heading"
        kicker="04 · Catalog"
        title="Product performance"
        description="Find products that attract attention, convert efficiently, or generate disproportionate revenue. Sort on any primary product signal."
        action={
          <span className="status-pill">
            <span
              className={`status-dot ${isPreparing ? "status-dot-building" : "status-dot-live"}`}
              aria-hidden="true"
            />
            <Icon name="grid" size={13} />
            {isPreparing ? "Building · " : ""}
            {formatNumber(data.length, workspaceLocale)} products
          </span>
        }
      />

      <div className="surface p-3 sm:p-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon="shopping-bag"
            title="No product performance to show"
            description="The selected scope contains no product activity. Broaden the date range or remove the category filter."
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-[0.95rem] border border-border xl:block">
              {sorted.length <= VIRTUALIZATION_THRESHOLD ? (
                <StandardProductTable
                  rows={sorted}
                  workspaceLocale={workspaceLocale}
                  workspaceCurrency={workspaceCurrency}
                  sortKey={sortKey}
                  direction={direction}
                  onSort={toggle}
                />
              ) : (
                <VirtualizedProductTable
                  rows={sorted}
                  workspaceLocale={workspaceLocale}
                  workspaceCurrency={workspaceCurrency}
                  sortKey={sortKey}
                  direction={direction}
                  onSort={toggle}
                />
              )}
            </div>

            <div className="space-y-2 xl:hidden">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-white/1.5 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Sorted by{" "}
                  <strong className="text-text-secondary">{sortKey}</strong> ·{" "}
                  {direction}
                </p>
                <label className="sr-only" htmlFor="product-mobile-sort">
                  Sort products
                </label>
                <select
                  id="product-mobile-sort"
                  value={`${sortKey}:${direction}`}
                  onChange={(event) => {
                    const [key, nextDirection] = event.target.value.split(
                      ":",
                    ) as [SortKey, Direction];
                    setSortKey(key);
                    setDirection(nextDirection);
                  }}
                  className="control-select min-h-11 min-w-0 py-1.5 text-xs"
                >
                  <option value="revenue:desc">Revenue ↓</option>
                  <option value="purchaseRate:desc">Rate ↓</option>
                  <option value="purchases:desc">Purchases ↓</option>
                  <option value="views:desc">Views ↓</option>
                  <option value="uniqueViewers:desc">Users ↓</option>
                  <option value="addToCart:desc">Cart ↓</option>
                  <option value="checkouts:desc">Checkout ↓</option>
                  <option value="productName:asc">Product A–Z</option>
                </select>
              </div>
              {sorted.map((row) => (
                <ProductMobileCard
                  key={row.productId}
                  row={row}
                  workspaceLocale={workspaceLocale}
                  workspaceCurrency={workspaceCurrency}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SortButton({
  label,
  sort,
  sortKey,
  direction,
  onSort,
}: {
  readonly label: string;
  readonly sort: SortKey;
  readonly sortKey: SortKey;
  readonly direction: Direction;
  readonly onSort: (sort: SortKey) => void;
}): React.JSX.Element {
  const active = sortKey === sort;
  return (
    <button
      type="button"
      onClick={() => onSort(sort)}
      aria-label={`Sort by ${label}`}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 text-left transition-colors duration-150 hover:bg-white/4 hover:text-text-primary"
    >
      {label}
      <span
        aria-hidden="true"
        className={active ? "text-text-primary" : "text-text-disabled"}
      >
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

function ProductHeader({
  sortKey,
  direction,
  onSort,
}: {
  readonly sortKey: SortKey;
  readonly direction: Direction;
  readonly onSort: (sort: SortKey) => void;
}): React.JSX.Element {
  return (
    <div
      role="row"
      className="grid min-w-264 items-center border-b border-border px-3"
      style={{ gridTemplateColumns: GRID_COLUMNS, minHeight: 48 }}
    >
      <div role="columnheader">
        <SortButton
          label="Product"
          sort="productName"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Views"
          sort="views"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Engaged users"
          sort="uniqueViewers"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Cart"
          sort="addToCart"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Checkout"
          sort="checkouts"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Purchases"
          sort="purchases"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Revenue"
          sort="revenue"
          {...{ sortKey, direction, onSort }}
        />
      </div>
      <div role="columnheader">
        <SortButton
          label="Rate"
          sort="purchaseRate"
          {...{ sortKey, direction, onSort }}
        />
      </div>
    </div>
  );
}

function StandardProductTable({
  rows,
  workspaceLocale,
  workspaceCurrency,
  sortKey,
  direction,
  onSort,
}: {
  readonly rows: readonly ProductPerformanceRow[];
  readonly workspaceLocale: string;
  readonly workspaceCurrency: string;
  readonly sortKey: SortKey;
  readonly direction: Direction;
  readonly onSort: (sort: SortKey) => void;
}): React.JSX.Element {
  return (
    <div
      role="table"
      aria-label="Product performance"
      className="overflow-x-auto"
    >
      <ProductHeader {...{ sortKey, direction, onSort }} />
      {rows.map((row) => (
        <ProductGridRow
          key={row.productId}
          row={row}
          workspaceLocale={workspaceLocale}
          workspaceCurrency={workspaceCurrency}
        />
      ))}
    </div>
  );
}

function VirtualizedProductTable({
  rows,
  workspaceLocale,
  workspaceCurrency,
  sortKey,
  direction,
  onSort,
}: {
  readonly rows: readonly ProductPerformanceRow[];
  readonly workspaceLocale: string;
  readonly workspaceCurrency: string;
  readonly sortKey: SortKey;
  readonly direction: Direction;
  readonly onSort: (sort: SortKey) => void;
}): React.JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const visibleStart = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  );
  const visibleEnd = Math.min(
    rows.length,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN_ROWS,
  );
  const visibleRows = rows.slice(visibleStart, visibleEnd);

  return (
    <div
      role="table"
      aria-rowcount={rows.length + 1}
      aria-label="Product performance"
      className="overflow-x-auto"
    >
      <ProductHeader {...{ sortKey, direction, onSort }} />
      <div
        className="min-w-264 overflow-y-auto"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
          {visibleRows.map((row, relativeIndex) => {
            const index = visibleStart + relativeIndex;
            return (
              <div
                key={row.productId}
                className="absolute inset-x-0"
                style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <ProductGridRow
                  row={row}
                  workspaceLocale={workspaceLocale}
                  workspaceCurrency={workspaceCurrency}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductGridRow({
  row,
  workspaceLocale,
  workspaceCurrency,
}: {
  readonly row: ProductPerformanceRow;
  readonly workspaceLocale: string;
  readonly workspaceCurrency: string;
}): React.JSX.Element {
  return (
    <div
      role="row"
      className="data-row grid min-w-264 items-center border-b border-border px-3"
      style={{ gridTemplateColumns: GRID_COLUMNS, minHeight: ROW_HEIGHT }}
    >
      <div role="cell" className="min-w-0 pr-3">
        <p
          className="truncate text-sm font-medium text-text-primary"
          title={row.productName}
        >
          {row.productName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatDisplayName(row.category)}
        </p>
      </div>
      <ProductValue value={formatNumber(row.views, workspaceLocale)} />
      <ProductValue value={formatNumber(row.uniqueViewers, workspaceLocale)} />
      <ProductValue value={formatNumber(row.addToCart, workspaceLocale)} />
      <ProductValue value={formatNumber(row.checkouts, workspaceLocale)} />
      <ProductValue
        value={formatNumber(row.purchases, workspaceLocale)}
        emphasis
      />
      <ProductValue
        value={formatCurrency(row.revenue, workspaceLocale, workspaceCurrency)}
        emphasis
      />
      <ProductValue
        value={formatPercent(row.purchaseRate, workspaceLocale)}
        emphasis
      />
    </div>
  );
}

function ProductValue({
  value,
  emphasis = false,
}: {
  readonly value: string;
  readonly emphasis?: boolean;
}): React.JSX.Element {
  return (
    <div
      role="cell"
      className={`truncate pr-3 text-right text-sm tabular-nums ${emphasis ? "font-semibold text-text-primary" : "text-text-secondary"}`}
    >
      {value}
    </div>
  );
}

const ProductMobileCard = memo(function ProductMobileCard({
  row,
  workspaceLocale,
  workspaceCurrency,
}: {
  readonly row: ProductPerformanceRow;
  readonly workspaceLocale: string;
  readonly workspaceCurrency: string;
}): React.JSX.Element {
  return (
    <article className="dashboard-surface-quiet rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-sm font-semibold text-text-primary"
            title={row.productName}
          >
            {row.productName}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDisplayName(row.category)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-success/20 bg-success/5 px-2 py-1 text-xs font-semibold tabular-nums text-success">
          {formatPercent(row.purchaseRate, workspaceLocale)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniMetric
          label="Revenue"
          value={formatCurrency(
            row.revenue,
            workspaceLocale,
            workspaceCurrency,
          )}
        />
        <MiniMetric
          label="Purchases"
          value={formatNumber(row.purchases, workspaceLocale)}
        />
        <MiniMetric
          label="Views"
          value={formatNumber(row.views, workspaceLocale)}
        />
        <MiniMetric
          label="Users"
          value={formatNumber(row.uniqueViewers, workspaceLocale)}
        />
        <MiniMetric
          label="Cart"
          value={formatNumber(row.addToCart, workspaceLocale)}
        />
        <MiniMetric
          label="Checkout"
          value={formatNumber(row.checkouts, workspaceLocale)}
        />
      </div>
    </article>
  );
});

function MiniMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-white/[0.018] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-text-secondary">
        {value}
      </p>
    </div>
  );
}

export default memo(ProductPerformanceTable);
