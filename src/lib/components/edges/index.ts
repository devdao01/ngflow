// We distinguish between internal and exported edges
// The internal edges are used directly like custom edges and always get an id, source and target props
// If you import an edge from the library, the id is optional and source and target are not used at all

export { BaseEdgeComponent } from './base-edge.component';
export { BezierEdgeComponent, BezierEdgeInternalComponent } from './bezier-edge.component';
export { SmoothStepEdgeComponent, SmoothStepEdgeInternalComponent } from './smoothstep-edge.component';
export { StepEdgeComponent, StepEdgeInternalComponent } from './step-edge.component';
export { StraightEdgeComponent, StraightEdgeInternalComponent } from './straight-edge.component';
