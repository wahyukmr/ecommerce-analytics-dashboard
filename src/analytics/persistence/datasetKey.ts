import type { GeneratorConfig } from "../../types";

export function createAnalyticsDatasetKey(
  config: GeneratorConfig,
  timezone: string,
): string {
  const canonical = JSON.stringify({
    timezone,
    totalUsers: config.totalUsers,
    days: config.days,
    personaDistribution: config.personaDistribution,
    products: [...config.products]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        priceRange: product.priceRange,
        popularity: product.popularity,
      })),
  });

  return `dataset_${fnv1a(canonical)}`;
}

function fnv1a(value: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(16);
}
