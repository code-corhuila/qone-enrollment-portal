import type { http, HttpResponse } from "msw";

// The MSW primitives a handler factory needs. Injected by whoever runs the handlers (this
// portal's tests, or the shell's browser worker through the exposed ./mocks module), so the
// handlers are always built with the same msw instance as the worker that runs them.
export interface Msw {
  http: typeof http;
  HttpResponse: typeof HttpResponse;
}
