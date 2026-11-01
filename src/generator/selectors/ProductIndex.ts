import type { ECommerceProduct } from "../../types";

export class ProductIndex {
  private readonly allProducts: readonly ECommerceProduct[];
  private readonly products = new Map<string, ECommerceProduct>();

  constructor(products: readonly ECommerceProduct[]) {
    this.allProducts = products;

    for (const product of products) {
      this.products.set(product.id, product);
    }
  }

  get(productId: string): ECommerceProduct {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error(`Unknown product "${productId}"`);
    }

    return product;
  }

  getOrUndefined(productId: string | undefined): ECommerceProduct | undefined {
    return productId ? this.products.get(productId) : undefined;
  }

  has(productId: string): boolean {
    return this.products.has(productId);
  }

  values(): readonly ECommerceProduct[] {
    return this.allProducts;
  }
}
