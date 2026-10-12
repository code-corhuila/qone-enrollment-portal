import { http, HttpResponse } from "msw";
import type { Msw } from "../msw";

// Every handler of the enrollment portal, built with the given msw primitives (ADR-009): the
// enrollment operations (EN-01..EN-14), the saga (WF-01..WF-03) and the catalog reads the
// enroll flow needs. Added with the screens that use them.
export function createHandlers(_msw: Msw) {
  return [];
}

/** The handlers for this portal's own tests (Node server in src/mocks/server.ts). */
export const handlers = createHandlers({ http, HttpResponse });
