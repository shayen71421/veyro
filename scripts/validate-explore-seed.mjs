import { validateExploreSeed } from "./explore-seed-utils.mjs";

try {
  const result = validateExploreSeed();
  console.log(`Explore seed valid: ${result.records.length} Finds, ${result.stations} stations, ${result.categories} categories.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Explore seed validation failed.");
  process.exitCode = 1;
}
