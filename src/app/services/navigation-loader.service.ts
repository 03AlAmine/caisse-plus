import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationLoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  show(): void {
    // ✅ Ne pas bloquer le thread principal
    requestAnimationFrame(() => {
      this.loadingSubject.next(true);
    });
  }

  hide(): void {
    requestAnimationFrame(() => {
      this.loadingSubject.next(false);
    });
  }
}
