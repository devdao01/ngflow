# ngflow — Angular port of xyflow (Svelte Flow 1.6.2 / @xyflow/system 0.0.79)

Source of truth: `xyflow/packages/svelte/src/lib` (Svelte 5 runes) — mapped 1:1 where possible.
`@xyflow/system` is installed from npm (in `demo/node_modules`, reachable from `ngflow/` via the
root `node_modules` symlink) and reused as-is. When upstream bumps `@xyflow/system`, update the
npm dependency in `demo/package.json` and regenerate `ngflow/styles/*.css` from
`xyflow/packages/svelte/src/styles` (postcss-import + postcss-nested, then `.xy-flow`/`.svelte-flow`
→ `.ng-flow`); component changes only matter when `packages/svelte/src` itself changes.

## Mapping conventions

| Svelte | Angular |
|---|---|
| `$state.raw(v)` | `signal(v)` |
| `$derived(expr)` / `$derived.by(fn)` | `computed(fn)` |
| `$props()` / `$bindable` | `input()` / `model()` signal inputs |
| `$effect(...)` | `effect(...)` |
| `setContext/getContext` (store key) | component-level DI: `provideFlowStore()` + `injectStore()` |
| node/edge id + connectable contexts | `NODE_ID`, `EDGE_ID`, `NODE_CONNECTABLE` InjectionTokens (per-node `Injector`) |
| `use:zoom`, `use:drag`, portal action | attribute directives (`ZoomDirective`, `DragDirective`, `FlowPortalDirective`) |
| `Component` in `nodeTypes`/`edgeTypes` | `Type<unknown>` rendered via `NgComponentOutlet` (`ngComponentOutletInputs` = NodeProps/EdgeProps) |
| Snippets / `children` | `<ng-content>`; component-type inputs for connectionLineComponent etc. |
| `MediaQuery` (svelte/reactivity) | `matchMedia` + signal (`media-query.ts`) |
| `@svelte-put/shortcut` KeyHandler | own key-matching util on window keydown/keyup (`key-handler.ts`) |
| class prefix `svelte-flow__*` | `ng-flow__*` (styles generated in `ngflow/styles/*.css` from system styles, flattened, `.xy-flow`→`.ng-flow`) |

## Structure

- `ngflow/src/index.ts` — public API (mirrors `$lib/index.ts`; also re-exports needed `@xyflow/system` symbols).
- `ngflow/src/lib/{types,store,directives,container,components,plugins,hooks,utils}`.
- Demo consumes it via tsconfig path `"ngflow": ["../ngflow/src/index.ts"]`.

## Component/DOM notes

- Components are standalone, OnPush, signal-based; host elements carry the flow classes
  (e.g. Zoom host = `ng-flow__zoom ng-flow__container`) so the rendered DOM matches the CSS
  from the original library even though Angular adds host elements where Svelte had none.
- The store is a per-NgFlow instance class (`FlowStore`) provided via DI; it holds signals +
  actions and receives the NgFlow component's input signals (fine-grained, like Svelte props).
- Writable store fields that components mutate (viewport, dragging, selectionRect, connection,
  panZoom, domNode, width, height, …) are `signal()`s; deriveds are `computed()`s.
- `nodesInitialized` computed intentionally keeps its side effects (adoptUserNodes into
  nodeLookup Maps) exactly like the Svelte `$derived.by` original. No sync signal writes inside.
- Arbitrary HTML attr passthrough (`...divAttributes`) is not supported (Angular limitation);
  `class`/`style`/`domAttributes` on nodes & edges are supported.

## Angular-specific pitfalls solved (keep in mind when extending)

1. **`setInput(undefined)` overrides input defaults** (Svelte keeps the default when a prop is
   undefined). `DynamicOutlet.setInputs` skips undefined values unless the input previously had a
   defined value, and built-in node/edge components resolve fallbacks in computeds
   (`position() ?? Position.Top`).
2. **Angular's `[style]` string parser rejects empty declarations (`;;`)** — NodeWrapper joins
   style parts instead of concatenating raw strings.
3. **Model inputs propagate asynchronously** (during CD), unlike Svelte's synchronous `$bindable`.
   `fitView()` therefore must NOT do `store.nodes = [...store.nodes]` synchronously (it would
   write the stale model value back over nodes the caller just set). It defers one tick and uses
   `store.retriggerAdoptUserNodes()` (an internal tick signal read by the `nodesInitialized`
   computed) so user data never round-trips.
4. **SVG namespace**: edge components must have `<g>` hosts (`DynamicOutlet` creates them with
   `createElementNS`), templates use `svg:` prefixed elements, and built-in edges are used as
   `<svg:g ngFlowBaseEdge …>`.
5. **Angular class bindings don't support objects nested in arrays** — every class list goes
   through `cc()` (clsx-style normalizer in `utils`).
6. **Capture-phase listeners** (`onpointerdowncapture`) can't be declared in `host` metadata —
   Pane registers them manually with `addEventListener(..., {capture: true})`.
7. Dev setup: everything (incl. `@xyflow/system`) is installed in `demo/node_modules`; the
   repo root has a single symlink `node_modules -> demo/node_modules` so files under `ngflow/`
   resolve all packages from the same physical tree. Never run `npm install` at the repo root
   (an earlier per-package symlink setup let root npm installs prune demo's packages).

## Known deviations

- `colorModeSSR` ignored (no SSR in demo).
- `Node.class`/`Edge.class` accept Angular class-binding values (string | string[] | object).
- Event handler props keep xyflow names (`onnodeclick`, …) but are implemented as regular
  `input()` callbacks, not Angular `output()`s, to preserve call-signature parity with Svelte Flow.
