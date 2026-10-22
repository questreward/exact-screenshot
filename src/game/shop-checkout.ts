/** Existing per-item purchases, not an atomic basket or a second payment system. */
export async function payShopItems<T extends { id: string }>(
  items: T[], requests: Map<string, string>,
  buy: (id: string, requestId: string) => Promise<{ reference: string }>,
  createKey: () => string,
) {
  const paid: { item: T; reference: string }[] = [];
  let failure: { item: T; message: string } | undefined;
  for (const item of items) {
    const key = requests.get(item.id) ?? createKey();
    requests.set(item.id, key);
    try {
      const result = await buy(item.id, key);
      paid.push({ item, reference: result.reference });
    } catch (error) {
      failure = { item, message: error instanceof Error ? error.message : "Le paiement n’a pas pu être confirmé." };
      break;
    }
  }
  return { paid, failure };
}