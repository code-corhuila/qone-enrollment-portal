import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { catalogApi } from "../../api/catalogApi";
import { isTerminal, sagaApi } from "../../api/sagaApi";
import { RequireRole } from "../../components/RequireRole";
import { useSessionUser } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { useMountBase } from "../../hooks/useMountBase";
import { newIdempotencyKey } from "../../model/idempotency";
import { CURRENT_TERM, formatSlots, REASON_TEXT, type Saga, type Section } from "../../model/enrollment";

const POLL_MS = 1000;
const POLL_LIMIT_MS = 30_000;

// HU-ENR-002: the student picks a group of a subject and starts the enroll-student saga
// (WF-02, D-10). The saga normally finishes within the request; a RUNNING one is polled
// (WF-03) until it is terminal. The outcome is shown with the reason the person understands
// (REASON_TEXT, D-01). Annex H: the button is disabled while pending and one Idempotency-Key
// per intention (student + section) is reused on retry.
export function EnrollPage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <Enroll />
    </RequireRole>
  );
}

type Outcome = { kind: "done"; saga: Saga; section: Section } | { kind: "failed"; error: Error };

function Enroll() {
  const { code = "" } = useParams();
  const base = useMountBase();
  const user = useSessionUser();
  const groups = useRequest((signal) => catalogApi.sectionsOf(code, CURRENT_TERM, signal), [code]);
  const [pending, setPending] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<Outcome | undefined>();
  const [taken, setTaken] = useState<Record<string, number>>({});
  const keys = useRef(new Map<string, string>());

  useEffect(() => {
    setOutcome(undefined);
    keys.current.clear();
  }, [code]);

  const keyFor = (sectionId: string) => {
    const existing = keys.current.get(sectionId);
    if (existing) return existing;
    const key = newIdempotencyKey("enroll");
    keys.current.set(sectionId, key);
    return key;
  };

  async function enroll(section: Section) {
    if (!user || pending) return;
    setPending(section.id);
    setOutcome(undefined);
    try {
      let saga = await sagaApi.startEnrollStudent({ studentId: user.id, sectionId: section.id, origin: "UI" }, keyFor(section.id));
      const deadline = Date.now() + POLL_LIMIT_MS;
      while (!isTerminal(saga) && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        saga = await sagaApi.getSaga(saga.id);
      }
      if (saga.status === "COMPLETED") {
        keys.current.delete(section.id);
        setTaken((t) => ({ ...t, [section.id]: (t[section.id] ?? 0) + 1 }));
      }
      setOutcome({ kind: "done", saga, section });
    } catch (cause) {
      setOutcome({ kind: "failed", error: cause instanceof Error ? cause : new Error(String(cause)) });
    } finally {
      setPending(undefined);
    }
  }

  return (
    <section aria-labelledby="enroll-title">
      <p>
        <Link to={`${base}/pensum`}>Back to the pensum</Link>
      </p>
      <h3 id="enroll-title">Enroll in {code}</h3>
      <p>Term {CURRENT_TERM}. Choose a group; the five gates run in order and the result is recorded.</p>

      {outcome ? <OutcomeBanner outcome={outcome} base={base} /> : null}

      {groups.status === "loading" ? <p role="status">Loading the groups of {code}...</p> : null}
      {groups.status === "error" ? <RequestFailure error={groups.error} retry={groups.retry} /> : null}
      {groups.status === "data" && groups.data.data.length === 0 ? <p>No groups open this term for {code}.</p> : null}
      {groups.status === "data" && groups.data.data.length > 0 ? (
        <table aria-label={`Groups of ${code}`}>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Professor</th>
              <th scope="col">Schedule</th>
              <th scope="col">Seats</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.data.data.map((s) => {
              const seats = s.seatsAvailable - (taken[s.id] ?? 0);
              return (
                <tr key={s.id}>
                  <td>Group {s.groupNumber}</td>
                  <td>{s.professorName}</td>
                  <td>{formatSlots(s.slots)}</td>
                  <td>{seats <= 0 ? "Full" : `${seats} seats`}</td>
                  <td>
                    <button type="button" onClick={() => void enroll(s)} disabled={seats <= 0 || pending !== undefined}>
                      {pending === s.id ? "Enrolling..." : `Enroll in group ${s.groupNumber}`}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

function OutcomeBanner({ outcome, base }: { outcome: Outcome; base: string }) {
  if (outcome.kind === "failed") {
    const traceId = failureOf(outcome.error).traceId;
    return (
      <div role="alert">
        <p>{outcome.error.message}</p>
        {traceId ? <p>Reference: {traceId}</p> : null}
      </div>
    );
  }
  const { saga, section } = outcome;
  if (saga.status === "COMPLETED") {
    return (
      <div role="status" aria-label="Enrollment result">
        <p>
          Enrollment confirmed: {section.subjectCode} group {section.groupNumber}.
        </p>
        <Link to={`${base}/enrollments`}>See my enrollments</Link>
      </div>
    );
  }
  if (saga.status === "COMPENSATED" && saga.reason) {
    return (
      <div role="alert">
        <p>{REASON_TEXT[saga.reason]}</p>
        <p>Saga {saga.id}, stopped at {saga.failedStep}.</p>
      </div>
    );
  }
  return (
    <div role="alert">
      <p>The enrollment could not be completed ({saga.status}). Quote saga {saga.id} to the academic office.</p>
    </div>
  );
}
