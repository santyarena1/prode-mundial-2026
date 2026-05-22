import type { FootballDataProvider } from "./interface";
import { ApiFootballProvider } from "./api-football";

export function getProvider(): FootballDataProvider {
  const name = process.env.FOOTBALL_PROVIDER || "manual";

  switch (name) {
    case "api-football":
      return new ApiFootballProvider();
    default:
      throw new Error(`Provider "${name}" is not configured. Set FOOTBALL_PROVIDER=api-football and add FOOTBALL_API_KEY.`);
  }
}

export { type FootballDataProvider } from "./interface";
