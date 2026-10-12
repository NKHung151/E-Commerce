/**
 * Cart and order lines only carry `product_id`; attach the full product to each line.
 * Missing / deleted products resolve to `product: null` instead of failing the whole list.
 *
 * `fetchProduct` is the app's own API call (shop and back office use different clients);
 * pass a `cache` Map to reuse results across calls.
 */
export async function attachProducts(lines, fetchProduct, cache) {
  const load = (id) => {
    if (!cache) return fetchProduct(id).catch(() => null);
    if (!cache.has(id)) cache.set(id, fetchProduct(id).catch(() => null));
    return cache.get(id);
  };
  const products = await Promise.all(lines.map((line) => load(line.product_id)));
  return lines.map((line, i) => ({ ...line, product: products[i] }));
}

/** Price of a line: current product price when known, else the price stored on the line. */
export const linePrice = (line) => Number(line.product?.price ?? line.unit_price);
