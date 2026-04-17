import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-page-header',
  template: `
    <div class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    h1 { font-size: 1.4rem; font-weight: 700; color: #111827; margin: 0 0 0.2rem; }
    p { font-size: 0.85rem; color: #6b7280; margin: 0; }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
