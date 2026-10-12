import { act, render, screen } from "@testing-library/react";
import { testSession } from "../../test/shell/session";
import { RequireRole } from "./RequireRole";

// Authorization inside the portal follows the access matrix of 07-api/authentication.md: the
// portal reads the role from shell/session and never the token. A wrong role sees a notice in
// place, not a redirect (the shell owns navigation and the sign-in).
describe("RequireRole", () => {
  it("renders the children for an allowed role", () => {
    testSession.signInAs({ id: "a-1", role: "ADMIN", name: "Patricia Mora" });
    render(
      <RequireRole roles={["ADMIN"]}>
        <p>admin tools</p>
      </RequireRole>,
    );
    expect(screen.getByText("admin tools")).toBeInTheDocument();
  });

  it("shows the permission notice for another role and for a visitor without session", () => {
    testSession.signInAs({ id: "s-1", role: "STUDENT", name: "Laura Gómez" });
    const { unmount } = render(
      <RequireRole roles={["ADMIN"]}>
        <p>admin tools</p>
      </RequireRole>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission for this section.");
    expect(screen.queryByText("admin tools")).not.toBeInTheDocument();
    unmount();

    testSession.reset();
    render(
      <RequireRole roles={["ADMIN"]}>
        <p>admin tools</p>
      </RequireRole>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("follows a session change while mounted", () => {
    testSession.signInAs({ id: "s-1", role: "STUDENT", name: "Laura Gómez" });
    render(
      <RequireRole roles={["ADMIN", "PROFESSOR"]}>
        <p>staff tools</p>
      </RequireRole>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => testSession.signInAs({ id: "p-1", role: "PROFESSOR", name: "Carlos Ramírez" }));

    expect(screen.getByText("staff tools")).toBeInTheDocument();
  });
});
