import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useRequest } from "./useRequest";

// The one request-state hook every view uses (Annex H): the four states - loading, error with
// retry, empty, data - and "a newer request replaces the older one" through AbortSignal.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function View({ load, deps }: { load: (signal: AbortSignal) => Promise<string[]>; deps: unknown[] }) {
  const state = useRequest(load, deps);
  if (state.status === "loading") return <p>loading</p>;
  if (state.status === "error") return <p>error: {state.error.message} <button onClick={state.retry}>retry</button></p>;
  if (state.data.length === 0) return <p>empty</p>;
  return <ul>{state.data.map((d) => <li key={d}>{d}</li>)}</ul>;
}

describe("useRequest", () => {
  it("goes loading, then data", async () => {
    const d = deferred<string[]>();
    render(<View load={() => d.promise} deps={[]} />);
    expect(screen.getByText("loading")).toBeInTheDocument();

    await act(async () => d.resolve(["a", "b"]));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("reports an empty result as its own state", async () => {
    render(<View load={() => Promise.resolve([])} deps={[]} />);
    expect(await screen.findByText("empty")).toBeInTheDocument();
  });

  it("exposes the error and retries on demand", async () => {
    const user = userEvent.setup();
    let calls = 0;
    render(<View load={() => (++calls === 1 ? Promise.reject(new Error("boom")) : Promise.resolve(["ok"]))} deps={[]} />);
    expect(await screen.findByText("error: boom")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "retry" }));

    expect(await screen.findByText("ok")).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("lets a newer request replace a slower older one, and aborts the older signal", async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const signals: AbortSignal[] = [];
    function Harness() {
      const [q, setQ] = useState("first");
      return (
        <>
          <button onClick={() => setQ("second")}>change</button>
          <View load={(signal) => { signals.push(signal); return q === "first" ? first.promise : second.promise; }} deps={[q]} />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "change" }));

    await act(async () => second.resolve(["second"]));
    await act(async () => first.resolve(["first"]));

    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.queryByText("first")).not.toBeInTheDocument();
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });
});
