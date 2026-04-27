import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss'],
})
export class ProfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);

  user: User | null = null;
  organisationNom: string = '';
  isEditing = false;
  saving = false;
  showPassword = false;

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadUser();
    this.loadOrganisation();
  }

  private initForm(): void {
    this.form = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }],
      newPassword: ['', [Validators.minLength(6)]],
      confirmNewPassword: [''],
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    const pwd = g.get('newPassword')?.value;
    const confirm = g.get('confirmNewPassword')?.value;
    if (pwd && confirm && pwd !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private loadUser(): void {
    this.user = this.auth.currentUser;
    this.form.patchValue({
      displayName: this.user?.displayName || '',
      email: this.user?.email || '',
    });
  }

  private async loadOrganisation(): Promise<void> {
    try {
      const org = await this.auth.getCurrentOrganisation();
      this.organisationNom = org?.nom || '';
    } catch {}
  }

  getUserInitial(): string {
    if (!this.user) return '?';
    if (this.user.displayName) return this.user.displayName.charAt(0).toUpperCase();
    if (this.user.email) return this.user.email.charAt(0).toUpperCase();
    return 'U';
  }

  getRoleLabel(role?: string): string {
    const roles: Record<string, string> = {
      admin: 'Administrateur',
      tresorier: 'Trésorier',
      auditeur: 'Auditeur',
      utilisateur: 'Utilisateur',
    };
    return roles[role || 'utilisateur'];
  }

  enableEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.form.reset({
      displayName: this.user?.displayName || '',
      email: this.user?.email || '',
      newPassword: '',
      confirmNewPassword: '',
    });
  }

  async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const val = this.form.value;

      await this.auth.updateUserProfile({ displayName: val.displayName });

      // TODO: Implémenter le changement de mot de passe dans AuthService
      if (val.newPassword) {
        this.toastr.info('Le changement de mot de passe sera disponible prochainement');
      }

      this.toastr.success('Profil mis à jour avec succès');
      this.isEditing = false;
      this.loadUser();
    } catch (error: any) {
      this.toastr.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      this.saving = false;
    }
  }

  async resetPassword(): Promise<void> {
    if (!this.user?.email) return;
    try {
      await this.auth.resetPassword(this.user.email);
      this.toastr.success('Email de réinitialisation envoyé');
    } catch {
      this.toastr.error('Erreur lors de l\'envoi de l\'email');
    }
  }
}
