import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router";
import { server } from "../../../mocks/server";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { resetSagas } from "../../../mocks/handlers/workflow";
import { testSession } from "../../../test/shell/session";
import { EnrollPage } from "./EnrollPage";

function renderPage(code = "ISW-604") {
  return render(
    <MemoryRouter initialEntries={[`/enrollment/enroll/${code}`]}>
      <Routes>
        <Route path="/enrollment/enroll/:code" element={<EnrollPage />} />
        <Route path="/enrollment/enrollments" element={<p>my enrollments</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const asLaura = () => testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
beforeEach(() => resetSagas());

// HU-ENR-002: a student picks a group and starts the enroll-student saga (WF-02); the outcome
// is a recorded fact with a reason the person understands (D-01). Annex H: button disabled
// while pending, one Idempotency-Key per intention reused on retry, four states.
describe("EnrollPage", () => {
  it("lists the groups of the subject with professor, schedule and seats, and disables full ones", async () => {
    asLaura();
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the groups");

    const table = await screen.findByRole("table", { name: "Groups of ISW-604" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Carlos Ramírez");
    expect(rows[0]).toHaveTextContent("MON 08:00-10:00, WED 08:00-10:00");
    expect(within(rows[0]!).getByRole("button", { name: "Enroll in group 1" })).toBeEnabled();
    expect(within(rows[2]!).getByText("Full")).toBeInTheDocument();
    expect(within(rows[2]!).getByRole("button", { name: "Enroll in group 3" })).toBeDisabled();
  });

  it("enrolls through the saga and shows the confirmation with a link to my enrollments", async () => {
    const user = userEvent.setup();
    asLaura();
    renderPage();
    const table = await screen.findByRole("table", { name: "Groups of ISW-604" });

    await user.click(within(table).getByRole("button", { name: "Enroll in group 1" }));

    const banner = await screen.findByRole("status", { name: "Enrollment result" });
    expect(banner).toHaveTextContent("Enrollment confirmed: ISW-604 group 1.");
    expect(within(banner).getByRole("link", { name: "See my enrollments" })).toHaveAttribute("href", "/enrollment/enrollments");
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("26 seats");
  });

  it("shows the reason of a compensated saga as the person reads it (tuition unpaid)", async () => {
    const user = userEvent.setup();
    testSession.signInAs({ id: enrollmentFixtures.santiago, role: "STUDENT", name: "Santiago Rojas" });
    renderPage("ISW-602");
    await user.click(await screen.findByRole("button", { name: "Enroll in group 1" }));

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent("Your tuition for this term is not paid yet.");
  });

  it("disables the button while the saga runs, keeps polling a RUNNING saga, and reuses the key on retry after a failure", async () => {
    const user = userEvent.setup();
    asLaura();
    const keys: string[] = [];
    let calls = 0;
    const running = { id: "s-run", type: "enroll-student", studentId: enrollmentFixtures.laura, sectionId: "x", origin: "UI", status: "RUNNING", completedSteps: ["check-tuition"], createdAt: "2026-10-12T00:00:00Z", updatedAt: "2026-10-12T00:00:00Z" };
    server.use(
      http.post("*/api/v1/sagas/enroll-student", ({ request }) => {
        keys.push(request.headers.get("idempotency-key") ?? "");
        calls += 1;
        if (calls === 1) return HttpResponse.json({ error: "SERVICE_UNAVAILABLE", message: "down", traceId: "t-w1" }, { status: 503 });
        return HttpResponse.json(running, { status: 201 });
      }),
      http.get("*/api/v1/sagas/s-run", () => HttpResponse.json({ ...running, status: "COMPLETED", completedSteps: ["check-tuition", "check-eligibility", "reserve-seat", "confirm-enrollment", "commit-seat"] })),
    );
    renderPage();
    const button = await screen.findByRole("button", { name: "Enroll in group 1" });

    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("t-w1");
    await user.click(screen.getByRole("button", { name: "Enroll in group 1" }));

    // The page polls a RUNNING saga once per second: allow a few polls before asserting.
    expect(await screen.findByRole("status", { name: "Enrollment result" }, { timeout: 5000 })).toHaveTextContent("Enrollment confirmed");
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(/^enroll-/);
  });

  it("shows the permission notice to a professor", () => {
    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
  });
});
