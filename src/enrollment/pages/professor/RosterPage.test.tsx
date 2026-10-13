import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { sections } from "../../../mocks/fixtures/catalog";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { testSession } from "../../../test/shell/session";
import { RosterPage } from "./RosterPage";

const isw604g1 = sections[4]!;
const isw604g2 = sections[5]!;

function renderPage(sectionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/enrollment/sections/${sectionId}/roster`]}>
      <Routes>
        <Route path="/enrollment/sections/:sectionId/roster" element={<RosterPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const asCarlos = () => testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });

// HU-WEB-002: the professor's roster of a section (EN-10), reached from "My sections" of the
// catalog portal. PROFESSOR or ADMIN; four states (Annex H).
describe("RosterPage", () => {
  it("shows the section heading and the confirmed students with their enrollment date", async () => {
    asCarlos();
    renderPage(isw604g1.id);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the roster");

    expect(await screen.findByRole("heading", { level: 3, name: "ISW-604 Sistemas Distribuidos, group 1" })).toBeInTheDocument();
    expect(screen.getByText("Carlos Ramírez, MON 08:00-10:00, WED 08:00-10:00")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Roster" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("María José Cabrera"),
      expect.stringContaining("Andrés Pineda"),
      expect.stringContaining("Valentina Suárez"),
    ]);
    expect(rows[0]).toHaveTextContent("2026-08-15");
    expect(screen.getByText("3 students confirmed, 27 seats left of 30")).toBeInTheDocument();
  });

  it("shows the empty state for a section without students", async () => {
    asCarlos();
    renderPage(isw604g2.id);
    expect(await screen.findByText("No student has confirmed this section yet.")).toBeInTheDocument();
  });

  it("refuses a student and accepts an admin", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    const { unmount } = renderPage(isw604g1.id);
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
    unmount();

    testSession.signInAs({ id: "33333333-3333-4333-8333-333333333331", role: "ADMIN", name: "Patricia Mora" });
    renderPage(isw604g1.id);
    expect(await screen.findByRole("table", { name: "Roster" })).toBeInTheDocument();
  });

  it("shows the error with the traceId and retries", async () => {
    const user = userEvent.setup();
    asCarlos();
    server.use(http.get("*/api/v1/enrollment/sections/:sectionId/roster", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-r1" }, { status: 500 }), { once: true }));
    renderPage(isw604g1.id);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-r1");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Roster" })).toBeInTheDocument();
  });
});
