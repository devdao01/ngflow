import {
  ApplicationRef,
  createComponent,
  reflectComponentType,
  type ComponentRef,
  type EnvironmentInjector,
  type Injector,
  type Type
} from '@angular/core';

const inputNamesCache = new Map<Type<unknown>, Set<string>>();

/**
 * Returns the declared input names of a component type. Node/edge components
 * only receive the NodeProps/EdgeProps they actually declare (like prop
 * spreading in Svelte/React, where unknown props are simply ignored).
 */
export function getComponentInputNames(type: Type<unknown>): Set<string> {
  let names = inputNamesCache.get(type);
  if (!names) {
    const mirror = reflectComponentType(type);
    names = new Set(mirror?.inputs.map((input) => input.templateName) ?? []);
    inputNamesCache.set(type, names);
  }
  return names;
}

/**
 * Imperative NgComponentOutlet replacement that supports a custom host
 * element (needed to host edge components on an SVG `<g>`) and reflection-
 * filtered inputs.
 */
export class DynamicOutlet<HostElement extends Element = Element> {
  private componentRef: ComponentRef<unknown> | null = null;
  private currentType: Type<unknown> | null = null;
  private inputNames = new Set<string>();
  private definedInputs = new Set<string>();
  private hostElement: HostElement | null = null;

  constructor(
    private appRef: ApplicationRef,
    private environmentInjector: EnvironmentInjector,
    private createHost: () => HostElement,
    private parent: () => Element
  ) {}

  /** (Re)creates the component when the type changes, updates inputs otherwise. */
  render(type: Type<unknown>, props: Record<string, unknown>, elementInjector: Injector) {
    if (this.currentType !== type || !this.componentRef) {
      this.destroy();

      this.hostElement = this.createHost();
      this.parent().appendChild(this.hostElement);
      this.currentType = type;
      this.inputNames = getComponentInputNames(type);

      const componentRef = createComponent(type, {
        environmentInjector: this.environmentInjector,
        elementInjector,
        hostElement: this.hostElement
      });
      this.setInputs(componentRef, props);
      this.appRef.attachView(componentRef.hostView);
      this.componentRef = componentRef;
    } else {
      this.setInputs(this.componentRef, props);
    }
  }

  private setInputs(componentRef: ComponentRef<unknown>, props: Record<string, unknown>) {
    for (const [key, value] of Object.entries(props)) {
      if (!this.inputNames.has(key)) {
        continue;
      }
      // mirror Svelte prop semantics: an undefined prop keeps the component's
      // own input default (unless the input previously had a defined value)
      if (value === undefined && !this.definedInputs.has(key)) {
        continue;
      }
      if (value !== undefined) {
        this.definedInputs.add(key);
      }
      componentRef.setInput(key, value);
    }
  }

  destroy() {
    if (this.componentRef) {
      this.appRef.detachView(this.componentRef.hostView);
      this.componentRef.destroy();
      this.componentRef = null;
    }
    if (this.hostElement) {
      this.hostElement.parentNode?.removeChild(this.hostElement);
      this.hostElement = null;
    }
    this.definedInputs.clear();
    this.currentType = null;
  }
}
