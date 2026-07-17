import { ChangeDetectionStrategy, Component } from '@angular/core';

import { injectStore } from '../../store';
import { ARIA_EDGE_DESC_KEY, ARIA_LIVE_MESSAGE, ARIA_NODE_DESC_KEY } from './index';

@Component({
  selector: 'ng-flow-a11y-descriptions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.id]="nodeDescId" class="a11y-hidden">
      {{
        store.disableKeyboardA11y
          ? store.ariaLabelConfig['node.a11yDescription.default']
          : store.ariaLabelConfig['node.a11yDescription.keyboardDisabled']
      }}
    </div>
    <div [attr.id]="edgeDescId" class="a11y-hidden">
      {{ store.ariaLabelConfig['edge.a11yDescription.default'] }}
    </div>
    @if (!store.disableKeyboardA11y) {
      <div [attr.id]="liveMessageId" aria-live="assertive" aria-atomic="true" class="a11y-live-msg">
        {{ store.ariaLiveMessage }}
      </div>
    }
  `,
  styles: `
    .a11y-hidden {
      display: none;
    }

    .a11y-live-msg {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      border: 0;
      padding: 0;
      overflow: hidden;
      clip: rect(0px, 0px, 0px, 0px);
      clip-path: inset(100%);
    }
  `
})
export class A11yDescriptionsComponent {
  protected store = injectStore();

  protected get nodeDescId() {
    return `${ARIA_NODE_DESC_KEY}-${this.store.flowId}`;
  }
  protected get edgeDescId() {
    return `${ARIA_EDGE_DESC_KEY}-${this.store.flowId}`;
  }
  protected get liveMessageId() {
    return `${ARIA_LIVE_MESSAGE}-${this.store.flowId}`;
  }
}
