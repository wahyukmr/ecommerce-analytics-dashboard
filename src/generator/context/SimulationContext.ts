import type { GeneratorConfig } from "../../types";
import { ProductIndex } from "../selectors/ProductIndex";
import { ProductsByCategory } from "../selectors/ProductsByCategory";
import { WeightedProduct } from "../selectors/WeightedProduct";

export class SimulationContext {
  readonly config: GeneratorConfig;
  readonly productIndex: ProductIndex;
  readonly productsByCategory: ProductsByCategory;
  readonly WeightedProduct: WeightedProduct;
  readonly simulationStartedAt: number;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.productIndex = new ProductIndex(config.products);
    this.productsByCategory = new ProductsByCategory(config.products);
    this.WeightedProduct = new WeightedProduct(config.products);
    this.simulationStartedAt = Date.now();
  }
}
