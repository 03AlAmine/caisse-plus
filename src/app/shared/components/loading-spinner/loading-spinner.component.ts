import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-loading-spinner',
  template: `<div class="spinner" [style.width.px]="size" [style.height.px]="size"></div>`,
  styles: [`.spinner { border: 3px solid #e5e7eb; border-top-color: #0f4c75; border-radius: 50%; animation: spin 0.7s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`]
})
export class LoadingSpinnerComponent {
  @Input() size = 32;
}
