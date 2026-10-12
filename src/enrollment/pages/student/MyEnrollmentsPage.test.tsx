import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { server } from "../../../mocks/server";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { testSession } from "../../../test/shell/session";
import { MyEnrollmentsPage } from "./MyEnrollmentsPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <MyEnrollmentsPage />
    </MemoryRouter>,
  );

// HU-ENR-001: my enrollments of the term, newest first, with the outcome of each attempt
// (a rejected attempt is a recorded fact, D-01).
describe("MyEnrollmentsPage", () => {
  it("lists my enrollments with subject, group, schedule and status", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    renderPage();

    const table = await screen.findByRole("table", { name: "My enrollments" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("MAT-501");
    expect(rows[0]).toHaveTextContent("Estadística II");
    expect(rows[0]).toHaveTextContent("Group 1");
    expect(rows[0]).toHaveTextContent("FRI 14:00-17:00");
    expect(rows[0]).toHaveTextContent("Confirmed");
  });

  it("shows a rejected attempt with the reason the person understands", async () => {
    testSession.signInAs({ id: enrollmentFixtures.santiago, role: "STUDENT", name: "Santiago Rojas" });
    server.use(
      http.get("*/api/v1/enrollment/enrollments/me", () =>
        HttpResponse.json({
          data: [{ ...enrollmentFixtures.enrollments[0]!, id: "r-1", studentId: enrollmentFixtures.santiago, studentName: "Santiago Rojas", status: "REJECTED", rejectionReason: "TUITION_UNPAID" }],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      ),
    );
    renderPage();

    const row = (await screen.findAllByRole("row")).slice(1)[0]!;
    expect(row).toHaveTextContent("Rejected");
    expect(row).toHaveTextContent("Your tuition for this term is not paid yet.");
  });

  it("shows the empty state, and the error with retry", async () => {
    const user = userEvent.setup();
    testSession.signInAs({ id: enrollmentFixtures.santiago, role: "STUDENT", name: "Santiago Rojas" });
    const { unmount } = renderPage();
    expect(await screen.findByText("You have no enrollments this term.")).toBeInTheDocument();
    unmount();

    server.use(http.get("*/api/v1/enrollment/enrollments/me", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-e1" }, { status: 500 }), { once: true }));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-e1");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("You have no enrollments this term.")).toBeInTheDocument();
  });
});
