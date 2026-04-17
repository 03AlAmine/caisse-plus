import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Permission } from '../../models/user.model';

/**
 * Affiche l'élément uniquement si l'utilisateur a la permission spécifiée.
 *
 * Usage :
 *   <button *canDo="'OPERATION_VALIDER'">Valider</button>
 *   <a *canDo="'CAISSE_CREER'" routerLink="nouveau">+ Caisse</a>
 */
@Directive({ selector: '[canDo]' })
export class CanDoDirective implements OnInit {
  private auth = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private permission!: Permission;

  @Input() set canDo(p: Permission) {
    this.permission = p;
    this.updateView();
  }

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    this.viewContainer.clear();
    if (this.auth.peut(this.permission)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
