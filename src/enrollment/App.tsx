import { Route, Routes } from "react-router";

// The module the shell mounts at /enrollment/* (exposed as ./App). Routes are relative to that
// mount. The screens of HU-ENR-001 (record, pensum, my enrollments, schedule), HU-ENR-002
// (enroll through the saga), HU-CER-001 (certificates) and HU-WEB-002 (roster) are added on
// top of this file.
export function App() {
  return (
    <section aria-labelledby="enrollment-title">
      <h2 id="enrollment-title">Enrollment</h2>
      <Routes>
        <Route index element={<p>Pensum, enrollments, schedule and certificates load here.</p>} />
      </Routes>
    </section>
  );
}

export default App;
