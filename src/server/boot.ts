import { OpenRouterKeyError } from "./env";

/** Print a clear boot failure and exit non-zero. */
export function exitOnBootFailure(error: unknown): never {
  if (error instanceof OpenRouterKeyError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(`Blinkai failed to start: ${error.message}`);
  } else {
    console.error("Blinkai failed to start.");
  }
  process.exit(1);
}
