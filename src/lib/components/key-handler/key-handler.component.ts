import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { isInputDOMNode, isMacOs } from '@xyflow/system';

import { injectStore } from '../../store';
import { deleteElements } from '../../utils/delete-elements';
import type { KeyDefinition, KeyDefinitionObject, KeyModifier } from '../../types';

type KeyInput = KeyDefinition | KeyDefinition[] | null | undefined;

function isKeyObject(key?: KeyDefinition | null): key is KeyDefinitionObject {
  return key !== null && typeof key === 'object';
}

function getModifiers(key?: KeyDefinition | null): KeyModifier[] {
  const modifier = isKeyObject(key) ? key.modifier || [] : [];
  return Array.isArray(modifier) ? modifier : [modifier];
}

function getKeyString(key?: KeyDefinition | null): string {
  if (key === null || key === undefined) {
    // this is a workaround to check if a key is set
    // if not we won't call the callback
    return '';
  }

  return isKeyObject(key) ? key.key : key;
}

function matchesEvent(event: KeyboardEvent, key: KeyInput): boolean {
  const keys = Array.isArray(key) ? key : [key];

  return keys.some((definition) => {
    const keyString = getKeyString(definition);
    if (!keyString || event.key !== keyString) {
      return false;
    }

    return getModifiers(definition).every((modifier) => event[`${modifier}Key`]);
  });
}

/**
 * Window-level key handling (replaces the Svelte @svelte-put/shortcut usage).
 */
@Component({
  selector: 'ng-flow-key-handler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    '(window:blur)': 'resetKeysAndSelection()',
    '(window:contextmenu)': 'resetKeysAndSelection()',
    '(window:keydown)': 'onKeyDown($event)',
    '(window:keyup)': 'onKeyUp($event)'
  }
})
export class KeyHandlerComponent {
  readonly selectionKey = input<KeyInput>(undefined);
  readonly multiSelectionKey = input<KeyInput>(undefined);
  readonly deleteKey = input<KeyInput>(undefined);
  readonly panActivationKey = input<KeyInput>(undefined);
  readonly zoomActivationKey = input<KeyInput>(undefined);

  private store = injectStore();

  private resolvedSelectionKey = computed<KeyInput>(() =>
    this.selectionKey() === undefined ? 'Shift' : this.selectionKey()
  );
  private resolvedMultiSelectionKey = computed<KeyInput>(() =>
    this.multiSelectionKey() === undefined ? (isMacOs() ? 'Meta' : 'Control') : this.multiSelectionKey()
  );
  private resolvedDeleteKey = computed<KeyInput>(() =>
    this.deleteKey() === undefined ? 'Backspace' : this.deleteKey()
  );
  private resolvedPanActivationKey = computed<KeyInput>(() =>
    this.panActivationKey() === undefined ? ' ' : this.panActivationKey()
  );
  private resolvedZoomActivationKey = computed<KeyInput>(() =>
    this.zoomActivationKey() === undefined ? (isMacOs() ? 'Meta' : 'Control') : this.zoomActivationKey()
  );

  protected resetKeysAndSelection() {
    const store = this.store;
    store.selectionRect = null;
    store.selectionKeyPressed = false;
    store.multiselectionKeyPressed = false;
    store.deleteKeyPressed = false;
    store.panActivationKeyPressed = false;
    store.zoomActivationKeyPressed = false;
  }

  private handleDelete() {
    const store = this.store;
    const selectedNodes = store.nodes.filter((node) => node.selected);
    const selectedEdges = store.edges.filter((edge) => edge.selected);

    deleteElements(store, {
      nodes: selectedNodes,
      edges: selectedEdges
    });
  }

  protected onKeyDown(event: KeyboardEvent) {
    const store = this.store;

    if (matchesEvent(event, this.resolvedSelectionKey())) {
      store.selectionKeyPressed = true;
    }
    if (matchesEvent(event, this.resolvedMultiSelectionKey())) {
      store.multiselectionKeyPressed = true;
    }
    if (matchesEvent(event, this.resolvedDeleteKey())) {
      const isModifierKey = event.ctrlKey || event.metaKey || event.shiftKey;
      if (!isModifierKey && !isInputDOMNode(event)) {
        store.deleteKeyPressed = true;
        this.handleDelete();
      }
    }
    if (matchesEvent(event, this.resolvedPanActivationKey())) {
      store.panActivationKeyPressed = true;
    }
    if (matchesEvent(event, this.resolvedZoomActivationKey())) {
      store.zoomActivationKeyPressed = true;
    }
  }

  protected onKeyUp(event: KeyboardEvent) {
    const store = this.store;

    if (matchesEvent(event, this.resolvedSelectionKey())) {
      store.selectionKeyPressed = false;
    }
    if (matchesEvent(event, this.resolvedMultiSelectionKey())) {
      store.multiselectionKeyPressed = false;
    }
    if (matchesEvent(event, this.resolvedDeleteKey())) {
      store.deleteKeyPressed = false;
    }
    if (matchesEvent(event, this.resolvedPanActivationKey())) {
      store.panActivationKeyPressed = false;
    }
    if (matchesEvent(event, this.resolvedZoomActivationKey())) {
      store.zoomActivationKeyPressed = false;
    }
  }
}
