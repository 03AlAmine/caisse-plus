import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.model';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.scss'],
})
export class UtilisateursComponent implements OnInit {
  private userService = inject(UserService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

  users$!: Observable<User[]>;
  showInviterModal = false;
  loadingInviter = false;
  loading = true;
  loadingRole: string | null = null;
  inviterForm!: FormGroup;

  ROLES: { value: UserRole; label: string; desc: string; color: string }[] = [
    {
      value: 'admin',
      label: 'Administrateur',
      desc: 'Accès complet',
      color: '#0f4c75',
    },
    {
      value: 'tresorier',
      label: 'Trésorier',
      desc: 'Gère les finances',
      color: '#10B981',
    },
    {
      value: 'auditeur',
      label: 'Auditeur',
      desc: 'Lecture seule',
      color: '#8B5CF6',
    },
    {
      value: 'utilisateur',
      label: 'Utilisateur',
      desc: 'Saisie limitée',
      color: '#6b7280',
    },
  ];

  ngOnInit(): void {
    this.users$ = this.userService.getAll();
    this.users$.subscribe(() => {
      this.loading = false;
    });

    this.inviterForm = this.fb.group({
      displayName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      role: ['utilisateur', Validators.required],
    });
  }

  getRoleInfo(role: string) {
    return this.ROLES.find((r) => r.value === role) ?? this.ROLES[3];
  }

  getInitiales(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return name.substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  estMoi(user: User): boolean {
    return user.uid === this.auth.currentUser?.uid;
  }

  getAdminsCount(users: User[]): number {
    return users.filter((u) => u.role === 'admin' && u.actif !== false).length;
  }

  getActiveUsersCount(users: User[]): number {
    return users.filter((u) => u.actif !== false).length;
  }

  async onChangerRole(user: User, role: UserRole): Promise<void> {
    if (this.estMoi(user)) {
      this.toastr.warning('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    if (user.role === role) return;

    const confirmed = confirm(
      `Changer le rôle de "${user.displayName || user.email}" de "${this.getRoleInfo(user.role).label}" vers "${this.getRoleInfo(role).label}" ?`,
    );

    if (!confirmed) return;

    this.loadingRole = user.uid;
    try {
      await this.userService.changerRole(user.uid, role);
      this.toastr.success(`Rôle modifié : ${this.getRoleInfo(role).label}`);
    } catch {
      this.toastr.error('Erreur lors du changement de rôle');
    } finally {
      this.loadingRole = null;
    }
  }

  async onDesactiver(user: User): Promise<void> {
    if (this.estMoi(user)) {
      this.toastr.warning('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    const action = user.actif !== false ? 'désactiver' : 'réactiver';
    const confirmed = confirm(
      `${action === 'désactiver' ? 'Désactiver' : 'Réactiver'} le compte de "${user.displayName || user.email}" ?`,
    );
    if (!confirmed) return;

    this.loadingRole = user.uid;
    try {
      if (user.actif !== false) {
        await this.userService.desactiver(user.uid);
        this.toastr.success('Compte désactivé');
      } else {
        await this.userService.mettreAJourProfil(user.uid, { actif: true });
        this.toastr.success('Compte réactivé');
      }
    } catch {
      this.toastr.error("Erreur lors de l'opération");
    } finally {
      this.loadingRole = null;
    }
  }

  openInviteModal(): void {
    this.inviterForm.reset({ role: 'utilisateur' });
    this.showInviterModal = true;
  }

  closeInviteModal(): void {
    this.showInviterModal = false;
  }

  async onInviter(): Promise<void> {
    if (this.inviterForm.invalid) {
      this.inviterForm.markAllAsTouched();
      return;
    }

    this.loadingInviter = true;
    try {
      const { email, displayName, role } = this.inviterForm.value;
      await this.userService.inviter(email, displayName, role);
      this.toastr.success(`Invitation envoyée à ${email}`);
      this.closeInviteModal();
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Un compte existe déjà avec cet email'
          : "Erreur lors de l'invitation";
      this.toastr.error(msg);
    } finally {
      this.loadingInviter = false;
    }
  }
}
