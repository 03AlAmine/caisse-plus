import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../models/user.model';
import { ToastrService } from 'ngx-toastr';

interface RoleInfo {
  value: UserRole;
  label: string;
  desc: string;
  color: string;
}

@Component({
  selector: 'app-utilisateurs',
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.scss'],
})
export class UtilisateursComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private firestore = inject(Firestore); // ← Ajouté
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  users$!: Observable<User[]>;
  loading = true;
  loadingRole: string | null = null;
  loadingInviter = false;

  // Modals
  showInviterModal = false;
  showDeactivateModal = false;
  showInvitationCodeModal = false;
  showPassword = false;
  userToDeactivate: User | null = null;
  invitationCode: string = '';
  createdUserCredentials: { email: string; password: string } | null = null;
  isEditingInvitation = false;

  // Cache des noms d'inviteurs
  private invitersCache: Map<string, string> = new Map();

  inviterForm!: FormGroup;

  ROLES: RoleInfo[] = [
    {
      value: 'admin',
      label: 'Administrateur',
      desc: 'Accès complet',
      color: '#0F172A',
    },
    {
      value: 'tresorier',
      label: 'Trésorier',
      desc: 'Gestion financière',
      color: '#059669',
    },
    {
      value: 'auditeur',
      label: 'Auditeur',
      desc: 'Lecture seule',
      color: '#7C3AED',
    },
    {
      value: 'utilisateur',
      label: 'Utilisateur',
      desc: "Saisie d'opérations",
      color: '#6B7280',
    },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadUsers();
  }

  private initForm(): void {
    this.inviterForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['utilisateur', Validators.required],
      invitationMode: ['email', Validators.required],
      password: [''],
    });

    // Validation conditionnelle du mot de passe
    this.inviterForm.get('invitationMode')?.valueChanges.subscribe((mode) => {
      const passwordControl = this.inviterForm.get('password');
      if (mode === 'direct') {
        passwordControl?.setValidators([
          Validators.required,
          Validators.minLength(8),
        ]);
      } else {
        passwordControl?.clearValidators();
        passwordControl?.setValue('');
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.users$ = this.userService.getAll();
    this.users$.subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.toastr.error('Erreur lors du chargement des utilisateurs');
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  estMoi(user: User): boolean {
    return user.uid === this.auth.currentUser?.uid;
  }

  getInitiales(nom: string): string {
    if (!nom) return '?';
    const parts = nom.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  }

  getRoleInfo(role: UserRole): RoleInfo {
    return this.ROLES.find((r) => r.value === role) || this.ROLES[3];
  }

  getAdminsCount(users: User[]): number {
    return users.filter((u) => u.role === 'admin' && u.actif !== false).length;
  }

  getActiveUsersCount(users: User[]): number {
    return users.filter((u) => u.actif !== false).length;
  }

  getPendingInvitationsCount(): number {
    // À implémenter si vous stockez les invitations en attente
    return 0;
  }

  getInviterName(inviterId: string): string {
    if (!inviterId) return 'Administrateur';

    if (this.invitersCache.has(inviterId)) {
      return this.invitersCache.get(inviterId)!;
    }

    // Charger le nom de l'inviteur depuis Firestore
    this.loadInviterName(inviterId);
    return '...';
  }

  private async loadInviterName(inviterId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(this.firestore, `users/${inviterId}`));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const name =
          data['displayName'] ||
          data['email']?.split('@')[0] ||
          'Administrateur';
        this.invitersCache.set(inviterId, name);
      } else {
        this.invitersCache.set(inviterId, 'Administrateur');
      }
    } catch (error) {
      console.error('Erreur chargement inviter:', error);
      this.invitersCache.set(inviterId, 'Inconnu');
    }
  }

  // ─── Actions utilisateurs ─────────────────────────────────────────────────

  async onChangerRole(user: User, newRole: UserRole): Promise<void> {
    if (user.role === newRole) return;

    // Vérifier qu'il reste au moins un admin
    if (user.role === 'admin' && newRole !== 'admin') {
      this.users$
        .subscribe((users) => {
          const adminCount = users.filter(
            (u) => u.role === 'admin' && u.actif !== false,
          ).length;
          if (adminCount <= 1) {
            this.toastr.error(
              'Impossible de retirer le dernier administrateur',
            );
            return;
          }
        })
        .unsubscribe();
    }

    this.loadingRole = user.uid;
    try {
      await this.userService.changerRole(user.uid, newRole);
      this.toastr.success(`Rôle de ${user.displayName} modifié avec succès`);
      this.loadUsers(); // Recharger la liste
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors du changement de rôle');
    } finally {
      this.loadingRole = null;
    }
  }

  onDesactiver(user: User): void {
    this.userToDeactivate = user;
    this.showDeactivateModal = true;
  }

  async confirmDeactivate(): Promise<void> {
    if (!this.userToDeactivate) return;

    this.loadingRole = this.userToDeactivate.uid;
    try {
      await this.userService.desactiver(this.userToDeactivate.uid);
      this.toastr.success(
        `${this.userToDeactivate.displayName} a été désactivé`,
      );
      this.closeDeactivateModal();
      this.loadUsers(); // Recharger la liste
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors de la désactivation');
    } finally {
      this.loadingRole = null;
    }
  }

  closeDeactivateModal(): void {
    this.showDeactivateModal = false;
    this.userToDeactivate = null;
  }

  async onReactiver(user: User): Promise<void> {
    this.loadingRole = user.uid;
    try {
      await this.userService.reactiver(user.uid);
      this.toastr.success(`${user.displayName} a été réactivé`);
      this.loadUsers(); // Recharger la liste
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors de la réactivation');
    } finally {
      this.loadingRole = null;
    }
  }

  // ─── Modal invitation ─────────────────────────────────────────────────────

  openInviteModal(): void {
    this.isEditingInvitation = false;
    this.createdUserCredentials = null;
    this.inviterForm.reset({
      invitationMode: 'email',
      role: 'utilisateur',
    });
    this.showPassword = false;
    this.showInviterModal = true;
  }

  closeInviteModal(): void {
    this.showInviterModal = false;
    this.createdUserCredentials = null;
    this.showPassword = false;
    this.inviterForm.reset();
  }

  generatePassword(): void {
    const password = this._generateSecurePassword();
    this.inviterForm.patchValue({ password });
  }

  private _generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async onInviter(): Promise<void> {
    if (this.inviterForm.invalid) {
      this.inviterForm.markAllAsTouched();
      return;
    }

    this.loadingInviter = true;
    const { displayName, email, role, invitationMode, password } =
      this.inviterForm.value;

    try {
      if (invitationMode === 'direct') {
        const result = await this.userService.inviter(
          email,
          displayName,
          role,
          {
            sendEmail: false,
            password: password,
            skipEmailVerification: true,
          },
        );

        this.createdUserCredentials = {
          email,
          password: password,
        };

        this.toastr.success(`Utilisateur ${displayName} créé avec succès`);
        this.loadUsers(); // Recharger la liste
        // Ne pas fermer la modal pour montrer les identifiants
      } else {
        await this.userService.inviter(email, displayName, role, {
          sendEmail: true,
        });

        this.toastr.success(`Invitation envoyée à ${email}`);
        this.loadUsers(); // Recharger la liste
        this.closeInviteModal();
      }
    } catch (error: any) {
      this.toastr.error(error.message || "Erreur lors de l'invitation");
    } finally {
      this.loadingInviter = false;
    }
  }

  copyCredentials(): void {
    if (this.createdUserCredentials) {
      const text = `Email: ${this.createdUserCredentials.email}\nMot de passe: ${this.createdUserCredentials.password}`;
      navigator.clipboard
        ?.writeText(text)
        .then(() => {
          this.toastr.info('Identifiants copiés dans le presse-papier');
        })
        .catch(() => {
          // Fallback pour les navigateurs sans clipboard API
          this.toastr.info(
            `Email: ${this.createdUserCredentials?.email} | Mot de passe: ${this.createdUserCredentials?.password}`,
          );
        });
    }
  }

  // ─── Code d'invitation ────────────────────────────────────────────────────

  async generateAndCopyInvitationCode(): Promise<void> {
    try {
      this.invitationCode = await this.userService.generateInvitationCode();
      this.showInvitationCodeModal = true;
    } catch (error: any) {
      this.toastr.error(
        error.message || 'Erreur lors de la génération du code',
      );
    }
  }

  closeInvitationCodeModal(): void {
    this.showInvitationCodeModal = false;
    this.invitationCode = '';
  }

  copyInvitationCode(): void {
    if (this.invitationCode) {
      navigator.clipboard
        ?.writeText(this.invitationCode)
        .then(() => {
          this.toastr.info("Code d'invitation copié");
        })
        .catch(() => {
          this.toastr.info(`Code d'invitation : ${this.invitationCode}`);
        });
    }
  }
}
