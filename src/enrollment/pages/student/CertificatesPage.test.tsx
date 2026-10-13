import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { server } from "../../../mocks/server";
import { enrollmentFixtures } from "../../../mocks/fixtures/enrollment";
import { resetCertificates } from "../../../mocks/handlers/certificates";
import { testSession } from "../../../test/shell/session";
import { CertificatesPage } from "./CertificatesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CertificatesPage />
    </MemoryRouter>,
  );
const asLaura = () => testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });
beforeEach(() => resetCertificates());

// HU-CER-001: issue a certificate once (idempotent, D-12), list mine with their public codes,
// and verify any code. Annex H: button disabled while pending, error beside the field, four states.
describe("CertificatesPage", () => {
  it("shows the empty state and the five types to issue", async () => {
    asLaura();
    renderPage();

    expect(await screen.findByText("You have no certificates yet.")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Certificate type")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Studies", "Enrollment", "Payment", "Clearance", "Progress"]);
  });

  it("issues a certificate and lists it with its code, then refuses to duplicate the same intention", async () => {
    const user = userEvent.setup();
    asLaura();
    const keys: string[] = [];
    server.events.on("request:start", ({ request }) => { const k = request.headers.get("idempotency-key"); if (k) keys.push(k); });
    renderPage();
    await screen.findByText("You have no certificates yet.");

    await user.selectOptions(screen.getByLabelText("Certificate type"), "pago");
    await user.click(screen.getByRole("button", { name: "Issue certificate" }));

    const table = await screen.findByRole("table", { name: "My certificates" });
    const row = within(table).getAllByRole("row")[1]!;
    expect(row).toHaveTextContent("Payment");
    expect(row).toHaveTextContent(/QMP-[A-Z0-9]{8}/);
    expect(screen.getByRole("status")).toHaveTextContent("Certificate issued with code QMP-");
    expect(new Set(keys).size).toBe(1);
  });

  it("shows the precondition of the service beside the form (unpaid tuition)", async () => {
    const user = userEvent.setup();
    testSession.signInAs({ id: enrollmentFixtures.santiago, role: "STUDENT", name: "Santiago Rojas" });
    renderPage();
    await screen.findByText("You have no certificates yet.");

    await user.selectOptions(screen.getByLabelText("Certificate type"), "paz-y-salvo");
    await user.click(screen.getByRole("button", { name: "Issue certificate" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("INV-ENR-002");
  });

  it("verifies a code: valid with the holder, unknown as not valid", async () => {
    const user = userEvent.setup();
    asLaura();
    renderPage();
    await screen.findByText("You have no certificates yet.");
    await user.selectOptions(screen.getByLabelText("Certificate type"), "estudios");
    await user.click(screen.getByRole("button", { name: "Issue certificate" }));
    const code = (await screen.findByRole("status")).textContent?.match(/QMP-[A-Z0-9]{8}/)?.[0] ?? "";

    await user.type(screen.getByLabelText("Verification code"), code);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText(`Valid: Studies certificate of Laura Gómez.`)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Verification code"));
    await user.type(screen.getByLabelText("Verification code"), "QMP-NOPE0000");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Not valid: no certificate has this code.")).toBeInTheDocument();
  });

  it("shows the error of the list with retry", async () => {
    const user = userEvent.setup();
    asLaura();
    server.use(http.get("*/api/v1/enrollment/certificates/me", () => HttpResponse.json({ error: "INTERNAL_ERROR", message: "x", traceId: "t-c1" }, { status: 500 }), { once: true }));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("t-c1");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("You have no certificates yet.")).toBeInTheDocument();
  });

  it("downloads the PDF of a certificate through the shell's client with its code as the file name", async () => {
    const user = userEvent.setup();
    asLaura();
    const created: string[] = [];
    const clicked: string[] = [];
    URL.createObjectURL = vi.fn(() => "blob:certificate");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    server.events.on("request:start", ({ request }) => { if (request.url.endsWith("/pdf")) created.push(request.headers.get("accept") ?? ""); });
    renderPage();
    await screen.findByText("You have no certificates yet.");
    await user.selectOptions(screen.getByLabelText("Certificate type"), "estudios");
    await user.click(screen.getByRole("button", { name: "Issue certificate" }));
    const issued = await screen.findByRole("status");
    const code = /QMP-[A-Z0-9]{8}/.exec(issued.textContent ?? "")![0];

    await user.click(await screen.findByRole("button", { name: `Download the PDF of ${code}` }));

    await vi.waitFor(() => expect(clicked).toEqual([`${code}.pdf`]));
    expect(created).toEqual(["application/pdf"]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:certificate");
  });

  it("says why a PDF could not be downloaded", async () => {
    const user = userEvent.setup();
    asLaura();
    server.use(http.get("*/api/v1/enrollment/certificates/:id/pdf", () => HttpResponse.json({ error: "NOT_FOUND", message: "resource not found", traceId: "t-pdf" }, { status: 404 })));
    renderPage();
    await screen.findByText("You have no certificates yet.");
    await user.click(screen.getByRole("button", { name: "Issue certificate" }));
    await screen.findByRole("status");
    await user.click(await screen.findByRole("button", { name: /Download the PDF of/ }));
    expect(await screen.findByText("Reference: t-pdf")).toBeInTheDocument();
  });
});
