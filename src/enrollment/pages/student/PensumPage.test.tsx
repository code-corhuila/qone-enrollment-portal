import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { testSession } from "../../../test/shell/session";
import { PensumPage } from "./PensumPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/pensum"]}>
      <Routes>
        <Route path="/pensum" element={<PensumPage />} />
        <Route path="/pensum/enroll/:code" element={<p>enroll flow</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const asLaura = () => testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });

// HU-ENR-001: the pensum with every subject classified PASSED / IN_PROGRESS / AVAILABLE /
// LOCKED, the progress totals, and the way into the enroll flow for an available subject.
describe("PensumPage", () => {
  it("shows the progress and every subject with its state, grouped by semester", async () => {
    asLaura();
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your pensum");

    expect(await screen.findByText("4 of 14 subjects passed, 11 of 42 credits (26%)")).toBeInTheDocument();
    const s5 = screen.getByRole("table", { name: "Semester 5" });
    expect(within(s5).getAllByRole("row").slice(1)).toHaveLength(5);
    expect(within(s5).getByRole("row", { name: /ISW-501/ })).toHaveTextContent("Passed");
    const s6 = screen.getByRole("table", { name: "Semester 6" });
    expect(within(s6).getByRole("row", { name: /ISW-601/ })).toHaveTextContent("In progress");
    expect(within(s6).getByRole("row", { name: /ISW-604/ })).toHaveTextContent("Available");
    const s7 = screen.getByRole("table", { name: "Semester 7" });
    const locked = within(s7).getByRole("row", { name: /ISW-701/ });
    expect(locked).toHaveTextContent("Locked");
    expect(locked).toHaveTextContent("missing ISW-604");
  });

  it("offers Enroll only on available subjects and routes to the enroll flow", async () => {
    const user = userEvent.setup();
    asLaura();
    renderPage();
    const s6 = await screen.findByRole("table", { name: "Semester 6" });

    expect(within(within(s6).getByRole("row", { name: /ISW-601/ })).queryByRole("link", { name: "Enroll" })).not.toBeInTheDocument();
    await user.click(within(within(s6).getByRole("row", { name: /ISW-604/ })).getByRole("link", { name: "Enroll" }));

    expect(screen.getByText("enroll flow")).toBeInTheDocument();
  });

  it("shows the permission notice to a professor", () => {
    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
  });

  it("shows the error with the traceId and retries", async () => {
    asLaura();
    server.use(http.get("*/api/v1/enrollment/pensum/me", () => HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "t-p1" }, { status: 503 }), { once: true }));
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-p1");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table", { name: "Semester 5" })).toBeInTheDocument();
  });
});
