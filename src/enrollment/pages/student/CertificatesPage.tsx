import { useId, useState, type FormEvent } from "react";
import { enrollmentApi } from "../../api/enrollmentApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { useIdempotencyKey } from "../../model/idempotency";
import type { Certificate, CertificateType, Verification } from "../../model/enrollment";

const TYPE_TEXT: Record<CertificateType, string> = { estudios: "Studies", matricula: "Enrollment", pago: "Payment", "paz-y-salvo": "Clearance", avance: "Progress" };
const TYPES = Object.keys(TYPE_TEXT) as CertificateType[];

// HU-CER-001: issue a certificate (EN-13, idempotent per intention, D-12), list mine with the
// public code (EN-12) and verify any code (EN-11). The PDF download (EN-14) arrives when the
// shell's client can fetch a binary. Annex H: button disabled while pending, four states.
export function CertificatesPage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <Certificates />
    </RequireRole>
  );
}

function Certificates() {
  const id = useId();
  const list = useRequest((signal) => enrollmentApi.myCertificates({ limit: 50 }, signal), []);
  const idempotency = useIdempotencyKey("certificate");
  const [type, setType] = useState<CertificateType>("estudios");
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState<Certificate | undefined>();
  const [issueError, setIssueError] = useState<{ message: string; traceId?: string } | undefined>();
  const [code, setCode] = useState("");
  const [verification, setVerification] = useState<{ code: string; result: Verification } | undefined>();

  async function issue(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setIssued(undefined);
    setIssueError(undefined);
    try {
      const created = await enrollmentApi.issueCertificate(type, idempotency.key);
      idempotency.reset();
      setIssued(created);
      list.status === "data" ? list.retry() : undefined;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const serverMessage = (cause as { serverMessage?: string }).serverMessage;
      setIssueError({ message: serverMessage || error.message, ...(failureOf(error).traceId ? { traceId: failureOf(error).traceId } : {}) });
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const result = await enrollmentApi.verifyCertificate(code.trim()).catch(() => ({ valid: false }) as Verification);
    setVerification({ code: code.trim(), result });
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>My certificates</h3>

      <form onSubmit={issue}>
        <label htmlFor={`${id}-type`}>Certificate type</label>{" "}
        <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as CertificateType)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_TEXT[t]}
            </option>
          ))}
        </select>{" "}
        <button type="submit" disabled={pending}>
          {pending ? "Issuing..." : "Issue certificate"}
        </button>
      </form>
      {issued ? (
        <p role="status">
          Certificate issued with code {issued.code}. Keep it: anyone can verify it.
        </p>
      ) : null}
      {issueError ? (
        <div role="alert">
          <p>{issueError.message}</p>
          {issueError.traceId ? <p>Reference: {issueError.traceId}</p> : null}
        </div>
      ) : null}

      {list.status === "loading" ? <p role="status">Loading your certificates...</p> : null}
      {list.status === "error" ? <RequestFailure error={list.error} retry={list.retry} /> : null}
      {list.status === "data" && list.data.data.length === 0 ? <p>You have no certificates yet.</p> : null}
      {list.status === "data" && list.data.data.length > 0 ? (
        <table aria-label="My certificates">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Code</th>
              <th scope="col">Term</th>
              <th scope="col">Issued</th>
            </tr>
          </thead>
          <tbody>
            {list.data.data.map((c) => (
              <tr key={c.id}>
                <td>{TYPE_TEXT[c.type]}</td>
                <td>{c.code}</td>
                <td>{c.term}</td>
                <td>{c.issuedAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <form onSubmit={verify}>
        <label htmlFor={`${id}-code`}>Verification code</label>{" "}
        <input id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="QMP-XXXXXXXX" />{" "}
        <button type="submit" disabled={code.trim() === ""}>
          Verify
        </button>
      </form>
      {verification ? (
        <p>
          {verification.result.valid && verification.result.type
            ? `Valid: ${TYPE_TEXT[verification.result.type]} certificate of ${verification.result.studentName ?? ""}.`
            : "Not valid: no certificate has this code."}
        </p>
      ) : null}
    </section>
  );
}
