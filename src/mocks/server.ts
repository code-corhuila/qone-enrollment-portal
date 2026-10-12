import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// MSW in Node, for Vitest. In development the shell runs the one browser worker (ADR-009);
// this portal registers its handlers there through its fixtures package, never its own worker.
export const server = setupServer(...handlers);
