import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    typeInscription: ['nouvelle', Validators.required], // 'nouvelle' ou 'existante'
    organisationNom: ['', [Validators.minLength(3)]], // Optionnel selon typeInscription
    organisationId: [''], // Pour rejoindre une organisation existante
    invitationCode: [''], // Code d'invitation optionnel
  }, { validators: [this.passwordMatchValidator, this.organisationValidator] });

  loading = false;
  errorMessage = '';
  showPassword = false;
  step = 1;

  ngOnInit(): void {
    // Mettre à jour les validateurs en fonction du type d'inscription
    this.form.get('typeInscription')?.valueChanges.subscribe(value => {
      this.updateValidators(value);
    });
    this.updateValidators(this.form.get('typeInscription')?.value);
  }

  private updateValidators(type: string): void {
    const organisationNomControl = this.form.get('organisationNom');
    const organisationIdControl = this.form.get('organisationId');
    const invitationCodeControl = this.form.get('invitationCode');

    if (type === 'nouvelle') {
      organisationNomControl?.setValidators([Validators.required, Validators.minLength(3)]);
      organisationIdControl?.clearValidators();
      invitationCodeControl?.clearValidators();
    } else {
      organisationNomControl?.clearValidators();
      organisationIdControl?.setValidators([Validators.required]);
      invitationCodeControl?.setValidators([]); // Optionnel
    }

    organisationNomControl?.updateValueAndValidity();
    organisationIdControl?.updateValueAndValidity();
    invitationCodeControl?.updateValueAndValidity();
  }

  // Validateur personnalisé pour le type d'inscription
  private organisationValidator(control: AbstractControl) {
    const type = control.get('typeInscription')?.value;
    const organisationNom = control.get('organisationNom')?.value;
    const organisationId = control.get('organisationId')?.value;

    if (type === 'nouvelle' && (!organisationNom || organisationNom.trim().length < 3)) {
      return { organisationNomRequired: true };
    }
    if (type === 'existante' && (!organisationId || organisationId.trim() === '')) {
      return { organisationIdRequired: true };
    }
    return null;
  }

  private passwordMatchValidator(control: AbstractControl) {
    const pwd = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  get displayName() { return this.form.get('displayName')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }
  get organisationNom() { return this.form.get('organisationNom')!; }
  get typeInscription() { return this.form.get('typeInscription')!; }
  get organisationId() { return this.form.get('organisationId')!; }
  get invitationCode() { return this.form.get('invitationCode')!; }

  nextStep(): void {
    // Valider les champs de l'étape 1
    this.displayName.markAsTouched();
    this.email.markAsTouched();
    this.password.markAsTouched();
    this.confirmPassword.markAsTouched();

    if (this.displayName.valid && this.email.valid && this.password.valid && !this.form.hasError('passwordMismatch')) {
      this.step = 2;
    }
  }

  previousStep(): void {
    this.step = 1;
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const type = this.typeInscription.value;
      const email = this.email.value;
      const password = this.password.value;
      const displayName = this.displayName.value;

      if (type === 'nouvelle') {
        // Création d'une nouvelle organisation
        await this.auth.registerWithNewOrganisation(
          email,
          password,
          displayName,
          this.organisationNom.value
        );
      } else {
        // Rejoindre une organisation existante
        await this.auth.registerToExistingOrganisation(
          email,
          password,
          displayName,
          this.organisationId.value,
          this.invitationCode.value || undefined
        );
      }

      // Naviguer dès que Firebase confirme l'authentification
      this.auth.isAuthenticated$.pipe(
        filter(isAuth => isAuth === true),
        take(1)
      ).subscribe(() => {
        this.router.navigate(['/dashboard']);
      });
    } catch (err: any) {
      this.errorMessage = this.getFirebaseError(err.code || err.message);
      this.step = 1; // Revenir à l'étape 1 en cas d'erreur
      this.loading = false;
    }
  }

  private getFirebaseError(code: string): string {
    const errors: Record<string, string> = {
      'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
      'auth/invalid-email': 'Adresse email invalide.',
      'auth/weak-password': 'Le mot de passe est trop faible (minimum 6 caractères).',
      'auth/operation-not-allowed': 'L\'inscription est temporairement désactivée.',
      'Organisation introuvable. Vérifiez le code d\'invitation.': 'Organisation introuvable. Vérifiez l\'ID.',
      'Code d\'invitation invalide.': 'Code d\'invitation invalide.',
      'Cette organisation n\'est plus active.': 'Cette organisation n\'est plus active.',
    };
    return errors[code] ?? `Une erreur est survenue: ${code}`;
  }
}
