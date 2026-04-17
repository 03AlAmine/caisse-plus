import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

/**
 * Affiche l'élément uniquement si l'utilisateur a l'un des rôles spécifiés.
 *
 * Usage :
 *   <button *hasRole="'admin'">Supprimer</button>
 *   <div *hasRole="['admin', 'tresorier']">Section trésorerie</div>
 */
@Directive({ selector: '[hasRole]' })
export class HasRoleDirective implements OnInit {
  private auth = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private roles: UserRole[] = [];

  @Input() set hasRole(roles: UserRole | UserRole[]) {
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    this.viewContainer.clear();
    if (this.auth.hasRole(...this.roles)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
