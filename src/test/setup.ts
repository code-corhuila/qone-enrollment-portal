import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "../mocks/server";
import { testSession } from "./shell/session";

// The portal is tested in isolation: `shell/apiClient` and `shell/session` resolve to the stubs
// in src/test/shell (vite.config.ts alias in test mode), and MSW answers the gateway; no test
// touches the network.
vi.stubEnv("VITE_GATEWAY_URL", "http://gateway.test");

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  testSession.reset();
});

afterAll(() => server.close());
