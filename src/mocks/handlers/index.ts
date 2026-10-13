import { http, HttpResponse } from "msw";
import type { Msw } from "../msw";
import { catalogHandlers } from "./catalog";
import { certificateHandlers } from "./certificates";
import { enrollmentHandlers } from "./enrollment";
import { workflowHandlers } from "./workflow";

// Every handler of the enrollment portal, built with the given msw primitives (ADR-009): the
// enrollment operations (EN-xx), the certificates, the enroll-student saga (WF-xx) and the
// catalog reads the enroll flow needs.
export function createHandlers(msw: Msw) {
  return [...enrollmentHandlers(msw), ...certificateHandlers(msw), ...workflowHandlers(msw), ...catalogHandlers(msw)];
}

/** The handlers for this portal's own tests (Node server in src/mocks/server.ts). */
export const handlers = createHandlers({ http, HttpResponse });
