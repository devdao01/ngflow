# ngflow (`@devdao01/ngflow`)

Angular port of [xyflow](https://github.com/xyflow/xyflow) (React Flow / Svelte Flow) —
a library for building node-based UIs, editors and diagrams.

> **Attribution**: ngflow is a derivative work based on and inspired by
> [xyflow](https://xyflow.com) by [webkid GmbH](https://webkid.io). The component
> architecture is ported from `@xyflow/svelte`, the framework-agnostic core is the original
> [`@xyflow/system`](https://www.npmjs.com/package/@xyflow/system) package, and the default
> theme is generated from xyflow's stylesheets. All credit for the original design and
> implementation belongs to the xyflow team. See [LICENSE](./LICENSE) (MIT).

## Features (ported from Svelte Flow 1.6.2 / system 0.0.79)

- `<ng-flow>` component with signal-based two-way binding for `nodes`, `edges`, `viewport`
- Dragging, panning, zooming, selection (box select, multi select), keyboard a11y
- Custom nodes & edges as plain Angular components (`nodeTypes` / `edgeTypes`)
- Handles, connection line, connection validation, edge reconnection
- Built-in edge types: bezier, straight, step, smoothstep + `BaseEdge` for custom ones
- Plugins: `Background`, `Controls`, `MiniMap`, `NodeResizer`, `NodeToolbar`, `EdgeToolbar`, `Panel`
- Hooks: `useNgFlow()` / `createFlowHelpers()`, `useNodes`, `useEdges`, `useViewport`,
  `useConnection`, `useNodeConnections`, `useNodesData`, `useOnSelectionChange`, …
- Sub flows (parent/child nodes), dark mode, fitView, viewport portal

## Installation

```bash
npm install @devdao01/ngflow
```

## Usage

```ts
import { Component, signal } from '@angular/core';
import { NgFlowComponent, BackgroundComponent, ControlsComponent, type Node, type Edge } from '@devdao01/ngflow';

@Component({
  selector: 'app-flow',
  imports: [NgFlowComponent, BackgroundComponent, ControlsComponent],
  template: `
    <ng-flow [(nodes)]="nodes" [(edges)]="edges" [fitView]="true">
      <ng-flow-background />
      <ng-flow-controls />
    </ng-flow>
  `
})
export class FlowComponent {
  nodes = signal<Node[]>([
    { id: '1', type: 'input', data: { label: 'Hello' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'ngflow' }, position: { x: 100, y: 120 } }
  ]);
  edges = signal<Edge[]>([{ id: 'e1-2', source: '1', target: '2' }]);
}
```

Import the theme once (e.g. in `styles.css`):

```css
@import '@devdao01/ngflow/styles/style.css'; /* or base.css for bare-minimum styles */
```

See `../demo` for a gallery of 24 runnable examples and `PORTING.md` for
architecture notes and porting conventions.
