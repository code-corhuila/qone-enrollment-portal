import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { server } from "../../../mocks/server";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { testSession } from "../../../test/shell/session";
import { SchedulePage } from "./SchedulePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  );

// HU-WEB-001: my weekly schedule - the confirmed classes of the term by day (EN-09).
describe("SchedulePage", () => {
  it("shows the week with each class block under its day", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your schedule");

    const week = await screen.findByRole("table", { name: "Weekly schedule" });
    const tue = within(week).getByRole("row", { name: /^TUE/ });
    expect(tue).toHaveTextContent("08:00-10:00 ISW-601 Bases de Datos II (group 1)");
    expect(tue).toHaveTextContent("14:00-16:00 ISW-605 Arquitectura de Software (group 1)");
    const fri = within(week).getByRole("row", { name: /^FRI/ });
    expect(fri).toHaveTextContent("14:00-17:00 MAT-501 Estadística II (group 1)");
    expect(within(week).getByRole("row", { name: /^SAT/ })).toHaveTextContent("No classes");
    expect(screen.getByText("4 classes this term")).toBeInTheDocument();
  });

  it("orders the blocks of a day by start time", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    renderPage();
    const week = await screen.findByRole("table", { name: "Weekly schedule" });
    const tueText = within(week).getByRole("row", { name: /^TUE/ }).textContent ?? "";
    expect(tueText.indexOf("08:00")).toBeLessThan(tueText.indexOf("14:00"));
  });

  it("shows the empty state for a student without classes", async () => {
    testSession.signInAs({ id: enrollmentFixtures.santiago, role: "STUDENT", name: "Santiago Rojas" });
    renderPage();
    expect(await screen.findByText("You have no confirmed classes this term.")).toBeInTheDocument();
  });

  it("shows the error with the traceId", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    server.use(http.get("*/api/v1/enrollment/schedule/me", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-s1" }, { status: 500 })));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("t-s1");
  });
});
