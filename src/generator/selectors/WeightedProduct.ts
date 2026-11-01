import type { ECommerceProduct } from "../../types";

export class WeightedProduct {
  private readonly cumulativeWeights: number[] = [];
  private readonly products: ECommerceProduct[] = [];
  private readonly totalWeight: number;

  constructor(products: ECommerceProduct[]) {
    let total = 0;

    for (const product of products) {
      total += product.popularity;

      this.products.push(product);
      this.cumulativeWeights.push(total);
    }

    this.totalWeight = total;
  }

  pick(): ECommerceProduct {
    const target = Math.random() * this.totalWeight;

    let low = 0;
    let high = this.cumulativeWeights.length - 1;

    while (low < high) {
      const mid = (low + high) >> 1;

      if (target <= this.cumulativeWeights[mid]) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return this.products[low];
  }
}
