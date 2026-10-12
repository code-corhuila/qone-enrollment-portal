import { createHandlers } from "./handlers";

// Exposed through Module Federation as `catalog/mocks` (ADR-009): when the shell runs with
// VITE_USE_MOCKS it loads this module and adds the handlers to its one browser worker, built
// with the shell's msw primitives. Never part of a production path.
export default createHandlers;
