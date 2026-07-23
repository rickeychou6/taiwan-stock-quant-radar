"use client";

export type ClientPortfolioItem = {
  id: string;
  symbol: string;
  shares: number;
  cost: number;
  name?: string;
  buyAmount?: number;
  stopLossPrice?: number;
  boughtAt?: string;
};

export const PORTFOLIO_STORAGE_KEY = "ai-stock-portfolio-v2";
export const PORTFOLIO_UPDATED_EVENT = "portfolio-updated";
export const PORTFOLIO_BUY_CONFIRMED_EVENT = "portfolio-buy-confirmed";
export const PORTFOLIO_SELL_CONFIRMED_EVENT = "portfolio-sell-confirmed";

export function readClientPortfolio() {
  if (typeof window === "undefined") return [] as ClientPortfolioItem[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) || "[]") as ClientPortfolioItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeClientPortfolio(items: ClientPortfolioItem[], options: { notify?: boolean } = {}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(items));
  if (options.notify !== false) {
    window.dispatchEvent(new Event(PORTFOLIO_UPDATED_EVENT));
  }
}

export function addClientPortfolioItem(item: Omit<ClientPortfolioItem, "id"> & { id?: string }) {
  const nextItem: ClientPortfolioItem = {
    ...item,
    id: item.id || `${item.symbol}-${Date.now()}`
  };
  const next = [nextItem, ...readClientPortfolio().filter((row) => row.id !== nextItem.id)];
  writeClientPortfolio(next);
  window.dispatchEvent(new CustomEvent(PORTFOLIO_BUY_CONFIRMED_EVENT, { detail: nextItem }));
  return nextItem;
}

export function removeClientPortfolioItem(id: string) {
  const current = readClientPortfolio();
  const removed = current.find((row) => row.id === id);
  writeClientPortfolio(current.filter((row) => row.id !== id));
  if (removed) {
    window.dispatchEvent(new CustomEvent(PORTFOLIO_SELL_CONFIRMED_EVENT, { detail: removed }));
  }
  return removed;
}

export function portfolioCostValue(item: ClientPortfolioItem) {
  return item.buyAmount || item.cost * item.shares;
}
