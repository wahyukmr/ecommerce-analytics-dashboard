import type { ECommerceProduct, GeneratorConfig } from "../types";

const categories = ["fashion", "beauty", "footwear", "accessories"] as const;

const products: ECommerceProduct[] = Array.from({ length: 24 }, (_, index) => ({
  id: `product_${index + 1}`,
  name: `Product ${index + 1}`,
  category: categories[index % categories.length],
  priceRange: { min: 50_000 + index * 5_000, max: 150_000 + index * 10_000 },
  popularity: 1 + ((index * 7) % 20),
}));

export function createGeneratorConfig(totalUsers: number): GeneratorConfig {
  return {
    totalUsers,
    days: 30,
    products,
    personaDistribution: {
      browser: 0.4,
      interested: 0.25,
      buyer: 0.2,
      loyal_customer: 0.15,
    },
  };
}

export const defaultGeneratorConfig = createGeneratorConfig(5_000);
