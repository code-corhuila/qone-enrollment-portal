import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { enrollmentFixtures } from "../mocks/fixtures/enrollment";
import { testSession } from "../test/shell/session";
import { App } from "./App";

// Mounted by the shell at /enrollment/*, the module renders its heading, its own navigation
// and the pensum on its index route; every link stays under the mount point.
describe("enrollment App", () => {
  it("renders the heading, the navigation and the pensum on the index route, under /enrollment", async () => {
    testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
    render(
      <MemoryRouter initialEntries={["/enrollment"]}>
        <Routes>
          <Route path="/enrollment/*" element={<App />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Enrollment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My enrollments" })).toHaveAttribute("href", "/enrollment/enrollments");
    expect(screen.getByRole("link", { name: "Schedule" })).toHaveAttribute("href", "/enrollment/schedule");
    expect(await screen.findByRole("heading", { level: 3, name: "My pensum" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Enroll" })[0]).toHaveAttribute("href", "/enrollment/enroll/ISW-602");
  });
});
