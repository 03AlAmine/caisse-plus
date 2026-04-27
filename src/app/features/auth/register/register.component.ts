import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import {
  TEMPLATES,
  ActiviteTemplate,
  getAllCategoriesFromTemplate,
} from '../../../models/templates.data';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  // Données
  templates = TEMPLATES;
  selectedTemplate: ActiviteTemplate | null = null;
  templatePreview: { nom: string; type: string; couleur: string }[] = [];

  form: FormGroup = this.fb.group(
    {
      // Étape 1 : Infos personnelles
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],

      // Étape 2 : Template
      templateId: ['', Validators.required],

      // Étape 3 : Organisation
      typeInscription: ['nouvelle', Validators.required],
      organisationNom: ['', [Validators.minLength(3)]],
      organisationId: [''],
      invitationCode: [''],
    },
    { validators: [this.passwordMatchValidator, this.organisationValidator] },
  );

  loading = false;
  errorMessage = '';
  showPassword = false;
  step = 1; // 1 = Infos, 2 = Template, 3 = Organisation
  totalSteps = 3;

  ngOnInit(): void {
    // Mettre à jour les validateurs en fonction du type d'inscription
    this.form.get('typeInscription')?.valueChanges.subscribe((value) => {
      this.updateOrganisationValidators(value);
    });
    this.updateOrganisationValidators(this.form.get('typeInscription')?.value);
  }

  private updateOrganisationValidators(type: string): void {
    const organisationNomControl = this.form.get('organisationNom');
    const organisationIdControl = this.form.get('organisationId');
    const invitationCodeControl = this.form.get('invitationCode');

    if (type === 'nouvelle') {
      organisationNomControl?.setValidators([
        Validators.required,
        Validators.minLength(3),
      ]);
      organisationIdControl?.clearValidators();
      invitationCodeControl?.clearValidators();
    } else {
      organisationNomControl?.clearValidators();
      organisationIdControl?.setValidators([Validators.required]);
      invitationCodeControl?.setValidators([]);
    }

    organisationNomControl?.updateValueAndValidity();
    organisationIdControl?.updateValueAndValidity();
    invitationCodeControl?.updateValueAndValidity();
  }

  private organisationValidator(control: AbstractControl) {
    const type = control.get('typeInscription')?.value;
    const organisationNom = control.get('organisationNom')?.value;
    const organisationId = control.get('organisationId')?.value;

    if (
      type === 'nouvelle' &&
      (!organisationNom || organisationNom.trim().length < 3)
    ) {
      return { organisationNomRequired: true };
    }
    if (
      type === 'existante' &&
      (!organisationId || organisationId.trim() === '')
    ) {
      return { organisationIdRequired: true };
    }
    return null;
  }

  private passwordMatchValidator(control: AbstractControl) {
    const pwd = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  // ─── Getters ────────────────────────────────────────────────────────────

  get displayName() {
    return this.form.get('displayName')!;
  }
  get email() {
    return this.form.get('email')!;
  }
  get password() {
    return this.form.get('password')!;
  }
  get confirmPassword() {
    return this.form.get('confirmPassword')!;
  }
  get organisationNom() {
    return this.form.get('organisationNom')!;
  }
  get typeInscription() {
    return this.form.get('typeInscription')!;
  }
  get organisationId() {
    return this.form.get('organisationId')!;
  }
  get invitationCode() {
    return this.form.get('invitationCode')!;
  }
  get templateId() {
    return this.form.get('templateId')!;
  }

  // ─── Navigation par étapes ─────────────────────────────────────────────

  nextStep(): void {
    if (this.step === 1) {
      // Valider les champs de l'étape 1
      this.displayName.markAsTouched();
      this.email.markAsTouched();
      this.password.markAsTouched();
      this.confirmPassword.markAsTouched();

      if (
        this.displayName.valid &&
        this.email.valid &&
        this.password.valid &&
        !this.form.hasError('passwordMismatch')
      ) {
        this.step = 2;
        this.errorMessage = '';
      }
    } else if (this.step === 2) {
      // Valider le choix du template
      if (!this.selectedTemplate) {
        this.errorMessage = "Veuillez choisir un modèle d'activité";
        return;
      }
      this.form.patchValue({ templateId: this.selectedTemplate.id });
      this.step = 3;
      this.errorMessage = '';
    }
  }

  previousStep(): void {
    if (this.step > 1) {
      this.step--;
      this.errorMessage = '';
    }
  }

  // ─── Sélection du template ─────────────────────────────────────────────

  selectTemplate(template: ActiviteTemplate): void {
    this.selectedTemplate = template;
    this.form.patchValue({ templateId: template.id });
    this.errorMessage = '';

    // Préparer l'aperçu des catégories (max 8)
    const allCategories = getAllCategoriesFromTemplate(template);
    this.templatePreview = allCategories.slice(0, 8).map((cat) => ({
      nom: cat.nom,
      type: cat.type === 'entree' ? 'Entrée' : 'Sortie',
      couleur: cat.couleur,
    }));
  }

  getTemplateIcon(icon: string): string {
    const icons: Record<string, string> = {
      building: 'M3 21h18M5 21V7l8-4v18M13 21V3l8 4v14',
      store: 'M3 9l2 10h14l2-10M3 9h18M9 9v12M15 9v12',
      fabric: 'M6 2h12v20H6V2zM10 2v20M14 2v20M6 10h12',
      restaurant:
        'M10 3v18M6 8c0-3 2-5 4-5s4 2 4 5v10M18 8c0-3-2-5-4-5s-4 2-4 5',
      tools:
        'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
      heart:
        'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
      plant: 'M12 22v-6M9 10c0-4 3-7 7-7M17 10c0 4-3 7-7 7M5 16c2-2 4-2 7 0',
      truck:
        'M1 12h13M8 3h6l4 6v9h-3M15 3v6h4M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
      custom: 'M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6zM12 2v20',
    };
    return icons[icon] || 'M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6z';
  }

  // ─── Soumission ────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedTemplate) {
      this.errorMessage = "Veuillez choisir un modèle d'activité";
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const type = this.typeInscription.value;
      const email = this.email.value;
      const password = this.password.value;
      const displayName = this.displayName.value;
      const templateId = this.selectedTemplate.id;

      if (type === 'nouvelle') {
        await this.auth.registerWithNewOrganisation(
          email,
          password,
          displayName,
          this.organisationNom.value,
          templateId,
        );
      } else {
        await this.auth.registerToExistingOrganisation(
          email,
          password,
          displayName,
          this.organisationId.value,
          this.invitationCode.value || undefined,
        );
      }

      // ✅ Rediriger vers les paramètres de l'organisation pour compléter le profil
      this.auth.isAuthenticated$
        .pipe(
          filter((isAuth) => isAuth === true),
          take(1),
        )
        .subscribe(() => {
          if (type === 'nouvelle') {
            // ✅ Forcer l'affichage du modal de bienvenue après inscription
            localStorage.removeItem('caisseplus_welcome_seen');

            // Rediriger vers le dashboard (le modal s'affichera automatiquement)
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        });
    } catch (err: any) {
      this.errorMessage = this.getFirebaseError(err.code || err.message);
      this.step = 1;
      this.loading = false;
    }
  }

  private getFirebaseError(code: string): string {
    const errors: Record<string, string> = {
      'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
      'auth/invalid-email': 'Adresse email invalide.',
      'auth/weak-password':
        'Le mot de passe est trop faible (minimum 6 caractères).',
      'auth/operation-not-allowed':
        "L'inscription est temporairement désactivée.",
      "Organisation introuvable. Vérifiez le code d'invitation.":
        "Organisation introuvable. Vérifiez l'ID.",
      "Code d'invitation invalide.": "Code d'invitation invalide.",
      "Cette organisation n'est plus active.":
        "Cette organisation n'est plus active.",
    };
    return errors[code] ?? `Une erreur est survenue: ${code}`;
  }
}
