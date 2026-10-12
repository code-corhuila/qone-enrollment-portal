import type { RequestHandler } from "msw";

// The MSW handlers of the enrollment portal: the enrollment operations (EN-01..EN-14), the
// saga (WF-01..WF-03) and the catalog reads the enroll flow needs. Added with the screens that
// use them; fixtures are the seed of qone-enrollment-db (06-data) validated against the contract.
export const handlers: RequestHandler[] = [];
