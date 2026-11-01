import type {
  GeneratorConfig,
  ProductCategory,
  PurchasePlan,
  User,
  UserPersona,
} from "../../types";
import { Timeline } from "../timeline/Timeline";

type PersonaProfile = {
  intentScore: number;
  hesitationScore: number;
};

const CATEGORY_POOLS: readonly ProductCategory[][] = [
  ["fashion"],
  ["beauty"],
  ["footwear"],
  ["fashion", "beauty"],
  ["fashion", "accessories"],
];

const PSYCHOLOGY: Readonly<Record<UserPersona, PersonaProfile>> = Object.freeze(
  {
    browser: { intentScore: 0.2, hesitationScore: 0.9 },
    interested: { intentScore: 0.5, hesitationScore: 0.6 },
    buyer: { intentScore: 0.8, hesitationScore: 0.3 },
    loyal_customer: { intentScore: 0.95, hesitationScore: 0.15 },
  },
);

export interface UserFactoryInterface {
  iterateUsers(config: GeneratorConfig): Iterable<User>;
}

export class UserFactory implements UserFactoryInterface {
  *iterateUsers(config: GeneratorConfig): IterableIterator<User> {
    for (let index = 0; index < config.totalUsers; index++) {
      yield this.createUser(config, index);
    }
  }

  private createUser(config: GeneratorConfig, index: number): User {
    const persona = this.pickUserType([
      ["browser", config.personaDistribution.browser],
      ["interested", config.personaDistribution.interested],
      ["buyer", config.personaDistribution.buyer],
      ["loyal_customer", config.personaDistribution.loyal_customer],
    ]);
    const profile = PSYCHOLOGY[persona];
    const preferredCategories =
      CATEGORY_POOLS[Math.floor(Math.random() * CATEGORY_POOLS.length)] ??
      CATEGORY_POOLS[0];

    return {
      id: `user_${index + 1}`,
      persona,
      plan: this.assignPlan(persona),
      signupTimestamp: Timeline.randomTimestampWithinDays(config.days),
      preferredCategories: [...preferredCategories],
      ...profile,
    };
  }

  private pickUserType(
    distribution: readonly [UserPersona, number][],
  ): UserPersona {
    const random = Math.random();
    let cumulative = 0;

    for (const [persona, probability] of distribution) {
      cumulative += probability;
      if (random <= cumulative) return persona;
    }

    return distribution[distribution.length - 1]?.[0] ?? "browser";
  }

  private assignPlan(persona: UserPersona): PurchasePlan {
    switch (persona) {
      case "loyal_customer":
        return Math.random() < 0.45 ? "pro" : "free";
      case "buyer":
        return Math.random() < 0.25 ? "pro" : "free";
      default:
        return Math.random() < 0.08 ? "pro" : "free";
    }
  }
}
