export interface Group<TItem> {
  key: string
  items: TItem[]
}

/**
 * Buckets items by a derived key while keeping the order the first member of each bucket arrived in.
 * Server responses are already ordered the way the buyer built them, so sorting here would only
 * reshuffle a sequence that already means something.
 */
export function groupInOrder<TItem>(items: TItem[], keyOf: (item: TItem) => string): Group<TItem>[] {
  const groups = new Map<string, Group<TItem>>()

  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
      continue
    }

    groups.set(key, { key, items: [item] })
  }

  return [...groups.values()]
}
