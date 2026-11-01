import type { ECommerceProduct, ProductCategory } from "../../types";

export class ProductsByCategory {
  private readonly categories = new Map<ProductCategory, ECommerceProduct[]>();

  constructor(products: readonly ECommerceProduct[]) {
    for (const product of products) {
      const bucket = this.categories.get(product.category);

      if (bucket) {
        bucket.push(product);
      } else {
        this.categories.set(product.category, [product]);
      }
    }
  }

  get(category: ProductCategory): readonly ECommerceProduct[] {
    return this.categories.get(category) ?? [];
  }

  getMany(categories: readonly ProductCategory[]): readonly ECommerceProduct[] {
    if (categories.length === 0) return [];
    const result: ECommerceProduct[] = [];
    const seen = new Set<string>();

    for (const category of categories) {
      for (const product of this.get(category)) {
        if (!seen.has(product.id)) {
          seen.add(product.id);
          result.push(product);
        }
      }
    }

    return result;
  }
}
