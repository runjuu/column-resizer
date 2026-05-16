Redesign and implement the resize system as a clean-slate arbitrary graph-junction architecture, replacing the current bar/section-indexed resize core and not preserving backwards compatibility. The final system must support arbitrary graph junction handles where dragging one handle can move any coherent graph-defined set of points, edges, regions, or variables according to explicit behavior policies.

Success must be verified by passing TypeScript type checks, package-level unit tests, graph behavior tests, DOM pointer interaction tests, React adapter tests, and example fixtures for cross, T-junction, L-junction, grouped-edge, and cyclic graph layouts.

Implement the redesign in layered packages with strict dependency boundaries:

1. `packages/resize-kernel`
   - Pure numeric solver only.
   - No DOM, React, CSS, pointer events, flexbox, bars, or sections.
   - Owns variables, constraints, delta vectors, scaled-vector solving, sessions, transactions, diagnostics, and validation.

2. `packages/resize-graph`
   - Owns graph topology and behavior planning.
   - Defines points, edges, regions, handles, traversal policies, behavior registries, graph-to-kernel constraint generation, resize programs, and graph-level policies.
   - Depends only on `resize-kernel`.

3. `packages/resize-dom`
   - Owns browser interaction.
   - Handles pointerdown, pointermove, pointerup, pointercancel, lostpointercapture, coordinate projection, RTL normalization, touch support through pointer events, measurement, and style writing.
   - Depends on `resize-graph` and `resize-kernel`, but not React.

4. `packages/resize-react`
   - Thin React adapter.
   - Provides graph provider, region, edge, and handle components/hooks.
   - Delegates all behavior to `resize-dom` and `resize-graph`.

5. Optional `packages/resize-testing`
   - Shared graph fixtures, solver assertions, pointer-event helpers, and integration fixtures.

Completion criteria:

- `resize-kernel` exposes a small, DOM-free API:
  - `ResizeVariable`
  - `Constraint`
  - `ResizeState`
  - `DeltaVector`
  - `solveScaledVector`
  - `createSession`
  - `preview`
  - `commit`
  - `cancel`
  - validation and diagnostics helpers.

- `resize-graph` exposes:
  - `ResizeGraph`
  - `GraphPoint`
  - `GraphEdge`
  - `GraphRegion`
  - `GraphHandle`
  - `ResizeBehavior`
  - `ResizeProgram`
  - behavior registry
  - built-in `junction-propagate` behavior
  - built-in policies for `scaled-vector`, `independent-axis`, `atomic-vector`, `sequential-priority`, and optional residual propagation.

- The default arbitrary junction behavior must:
  - start from the active handle,
  - resolve related graph entities using explicit policies,
  - avoid surprising global propagation by default,
  - support `incident`, `propagate-marked-edges`, `same-group`, and `whole-connected-component` traversal,
  - support x-only, y-only, and both-axis handles,
  - support independent-axis and atomic-vector clamp semantics,
  - preserve all declared constraints.

- Custom behavior must be clean:
  - behavior functions must return resize programs, not mutate state directly;
  - custom policies must be injectable and testable;
  - custom traversal/residual behavior must not require changing the kernel.

- The old concepts must not leak into the new core:
  - no `BarAction`,
  - no `BarActionType`,
  - no `SizeInfo`,
  - no `SizeRelatedInfo`,
  - no `ItemType.BAR`,
  - no `ItemType.SECTION`,
  - no `flexGrowRatio`,
  - no `beforeApplyResizer`,
  - no bar-index-based resize algorithm in the new kernel or graph packages.

Implementation sequence:

Phase 1: create package boundaries.
- Add package skeletons and exports.
- Enforce dependency direction:
  - `resize-kernel <- resize-graph <- resize-dom <- resize-react`.
- Add tests proving `resize-kernel` imports no DOM/browser/React APIs.

Phase 2: implement kernel variables and constraints.
- Add variable validation.
- Add range constraints.
- Add distance constraints.
- Add locked variables.
- Add fixed-distance support using distance constraints with `min === max`.
- Tests:
  - valid finite variables,
  - invalid NaN/Infinity variables,
  - missing referenced variables,
  - invalid `min > max`,
  - locked variable validation,
  - fixed distance validation,
  - multiple validation errors reported deterministically.

Phase 3: implement `solveScaledVector`.
- Compute the maximum feasible scale for a requested delta vector.
- Respect variable bounds, locked variables, and distance constraints.
- Return next state, requested vector, applied vector, residual vector, hit constraints, changed variables, and blocked status.
- Tests:
  - variable grows within max,
  - variable clamps at max,
  - variable clamps at min,
  - locked variable blocks movement,
  - distance min blocks movement,
  - distance max blocks movement,
  - strongest constraint wins,
  - unrelated constraints do not clamp movement,
  - residual vector is correct,
  - constraint order does not affect result.

Phase 4: implement kernel sessions and transactions.
- All pointer-move previews must compute from activation snapshot, not from the previous preview.
- Add preview, commit, cancel behavior.
- Tests:
  - preview does not mutate session,
  - commit updates current state,
  - cancel restores initial state,
  - repeated previews use the initial activation state,
  - discarded preview does not poison later preview,
  - empty resize program leaves state unchanged,
  - non-finite deltas are rejected or ignored deterministically.

Phase 5: implement graph model and graph-to-kernel constraint generation.
- Add points, edges, regions, handles, raw custom constraints, and graph validation.
- Rectangular regions should generate width/height distance constraints.
- Tests:
  - region min/max width constraints,
  - region min/max height constraints,
  - locked/fixed region constraints,
  - raw custom constraints preserved,
  - duplicate IDs rejected,
  - missing point/edge/handle references rejected,
  - T-junction graph validates,
  - cross-junction graph validates,
  - cyclic graph validates.

Phase 6: implement default arbitrary junction behavior.
- Add `junction-propagate`.
- Add relation policies:
  - `incident`,
  - `propagate-marked-edges`,
  - `same-group`,
  - `whole-connected-component`.
- Add axis handling:
  - x-only,
  - y-only,
  - both-axis.
- Add vector handling:
  - independent-axis,
  - atomic-vector.
- Tests:
  - incident-only junction moves only directly related entities,
  - marked-edge traversal follows only propagating edges,
  - group traversal ignores other groups,
  - connected-component traversal visits all connected resize entities,
  - cycles terminate,
  - x-only ignores y movement,
  - y-only ignores x movement,
  - both-axis moves x and y,
  - atomic vector scales both axes by the limiting scale,
  - independent-axis clamps x and y separately,
  - locked connected variables clamp movement.

Phase 7: implement resize programs and policy execution.
- Behavior functions return `ResizeProgram`.
- Program phases execute deterministically.
- Add policy registry.
- Add built-in policies:
  - `scaled-vector`,
  - `independent-axis`,
  - `atomic-vector`,
  - `sequential-priority`.
- Tests:
  - one-phase program equals direct solver result,
  - multi-phase program applies phases in priority order,
  - failed phase behavior is policy-controlled,
  - custom policy receives correct context,
  - custom policy can discard movement,
  - custom policy can replace vectors,
  - residual movement is visible to later phases,
  - program execution does not mutate input state.

Phase 8: implement optional graph-level residual rerouting.
- Keep rerouting out of the kernel.
- Add graph policy that can route blocked residual movement through eligible graph paths.
- Configurable traversal:
  - breadth-first,
  - depth-first,
  - maxDepth,
  - allowed edge kinds,
  - group boundaries.
- Tests:
  - no reroute when primary target has capacity,
  - full reroute when primary target is locked,
  - partial reroute when primary target partially moves,
  - maxDepth respected,
  - `propagate: false` respected,
  - group boundary respected,
  - cycle traversal terminates,
  - diagnostics show primary and rerouted movement,
  - no target leaves residual unapplied.

Phase 9: implement DOM adapter.
- Use pointer events as primary interaction model.
- Implement pointer capture.
- Normalize coordinates.
- RTL flips horizontal x movement only.
- Touch support should work through pointer events.
- Avoid layout reads during pointermove after activation.
- Tests:
  - pointerdown creates active session,
  - non-primary pointer ignored,
  - right mouse button ignored,
  - wrong pointerId ignored,
  - pointermove previews graph state,
  - pointerup commits and clears session,
  - pointercancel clears session,
  - lostpointercapture clears session,
  - pointer capture requested and released,
  - x RTL projection flips,
  - y movement unaffected by RTL,
  - x-only handle ignores y,
  - y-only handle ignores x,
  - both-axis handle uses both,
  - no layout reads during pointermove,
  - discarded preview does not mutate DOM.

Phase 10: implement style writer and measurement.
- Start with absolute-position layout because arbitrary graph junctions are easier to reason about in coordinate space than flexbox.
- Regions derive left/top/width/height from graph variables.
- Edges and handles derive positions from graph points.
- Preserve fractional pixels unless configured otherwise.
- Tests:
  - region width from `right - left`,
  - region height from `bottom - top`,
  - edge position updates,
  - handle position updates,
  - writes are batched,
  - unchanged values are not rewritten,
  - fractional pixels preserved,
  - hidden element fallback behavior is deterministic,
  - cross, T, L, and cycle fixtures render expected geometry.

Phase 11: implement React adapter.
- Keep React thin.
- Provide:
  - `ResizeGraphProvider`,
  - `ResizeRegion`,
  - `ResizeEdge`,
  - `ResizeHandle`,
  - hooks for graph, region, edge, handle, and events.
- Tests:
  - provider creates one controller,
  - region registers/unregisters,
  - edge registers/unregisters,
  - handle registers/unregisters,
  - dragging handle updates region styles,
  - rerender does not reset active session,
  - unmount during drag cleans up,
  - graph prop changes rebuild intentionally,
  - behavior registry updates intentionally,
  - multiple providers are isolated,
  - nested providers are isolated,
  - custom behavior is invoked,
  - event order is activate -> preview/move -> commit/deactivate,
  - no duplicate listeners after rerender.

Phase 12: remove or quarantine old architecture.
- Delete or stop exporting the old bar/section-indexed implementation.
- Ensure new packages do not import old files.
- Tests:
  - new kernel tests do not import old core files,
  - graph tests do not import old `SizeInfo`,
  - DOM tests do not use old `data-item-type`,
  - React tests do not use old `Container`, `Bar`, or `Section`,
  - TypeScript build fails if new packages reference old public API,
  - bundle output contains no old bar-store code.

Use this fixture as a mandatory end-to-end test:

Container: 800 x 600.
Variables:
- x0 = 0 locked
- x1 = 250
- x2 = 500
- x3 = 800 locked
- y0 = 0 locked
- y1 = 200
- y2 = 400
- y3 = 600 locked

Regions around junction J:
- top-left: x0..x1, y0..y1
- top-right: x1..x2, y0..y1
- bottom-left: x0..x1, y1..y2
- bottom-right: x1..x2, y1..y2

Each region has minWidth >= 100 and minHeight >= 100.
Dragging J by dx = +200 and dy = +150 must produce:
- independent-axis policy: applied dx = +150, applied dy = +100
- atomic-vector policy: applied dx = approximately +133.333, applied dy = +100

Iteration policy:
- Work phase by phase.
- For each phase, add or update tests before or alongside implementation.
- After each phase, run the smallest relevant test target first, then the broader package checks.
- If a test fails, inspect the failure and either fix the implementation or correct an invalid test expectation.
- Do not proceed to the next layer until the lower layer has passing tests and a small, stable API.
- Prefer simple abstractions over speculative features.
- Keep the kernel minimal and push topology, traversal, rerouting, DOM, and rendering behavior into higher layers.

Constraints:
- Do not preserve backward compatibility with the old `Container`, `Bar`, `Section`, `Resizer`, `beforeApplyResizer`, `SizeInfo`, or bar-index APIs.
- Do not put DOM, CSS, React, pointer events, or flexbox into `resize-kernel`.
- Do not hard-code arbitrary graph traversal into the kernel.
- Do not let behavior functions mutate state directly; they must return resize programs.
- Do not silently violate constraints.
- Do not declare success based on plausibility. Success requires passing tests, type checks, and fixture evidence.
- If a design choice is ambiguous, choose the option that keeps `resize-kernel` smaller and moves custom behavior into graph policies or behavior planners.

If blocked:
- Stop and report the blocker, attempted paths, evidence gathered, failing command or test output, and the smallest decision or input needed to continue.
- If a full implementation cannot be completed under the current budget, leave the repository in a coherent partial state with passing tests for completed phases and a TODO list for remaining phases.
