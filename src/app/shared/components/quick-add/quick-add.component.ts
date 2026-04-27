import { Component, ElementRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CaisseService } from '../../../services/caisse.service';
import { CategorieService } from '../../../services/categorie.service';
import { OperationService } from '../../../services/operation.service';
import { AuthService } from '../../../services/auth.service';
import { VocabulaireService } from '../../../services/vocabulaire.service';
import { ToastrService } from 'ngx-toastr';
import { Caisse } from '../../../models/caisse.model';
import { Categorie } from '../../../models/categorie.model';
import { VocabulaireMetier } from '../../../models/templates.data';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-quick-add',
  template: `
    <!-- Bouton flottant -->
    <button class="quick-add-fab" (click)="open()" *ngIf="!isOpen" @fabIn>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Overlay -->
    <div class="quick-add-overlay" *ngIf="isOpen" @overlayIn (click)="close()"></div>

    <!-- Panneau -->
    <div class="quick-add-panel" *ngIf="isOpen" @panelIn>
      <div class="quick-add-panel__header">
        <div class="quick-add-panel__title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>{{ panelTitle }}</span>
        </div>
        <button class="quick-add-panel__close" (click)="close()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="quick-add-form">
        <!-- Toggle Entrée/Sortie -->
        <div class="quick-add-toggle">
          <button
            type="button"
            class="quick-add-toggle__btn"
            [class.quick-add-toggle__btn--active]="form.get('type')?.value === 'entree'"
            [style.--active-color]="'var(--color-success)'"
            (click)="setType('entree')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 14V2M2 8l6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ v.entree }}
          </button>
          <button
            type="button"
            class="quick-add-toggle__btn"
            [class.quick-add-toggle__btn--active]="form.get('type')?.value === 'sortie'"
            [style.--active-color]="'var(--color-danger)'"
            (click)="setType('sortie')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8l6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ v.sortie }}
          </button>
        </div>

        <!-- Montant -->
        <div class="quick-add-amount">
          <input
            type="number"
            class="quick-add-amount__input"
            formControlName="montant"
            placeholder="0"
            min="1"
            step="100"
            #montantInput
          />
          <span class="quick-add-amount__currency">FCFA</span>
        </div>

        <!-- Libellé -->
        <div class="form-group">
          <label class="form-label">Libellé</label>
          <input
            type="text"
            class="form-control"
            formControlName="libelle"
            [placeholder]="libellePlaceholder"
          />
        </div>

        <!-- Catégorie et Caisse en ligne -->
        <div class="quick-add-row">
          <div class="form-group" style="flex:1">
            <label class="form-label">Catégorie</label>
            <select class="form-control form-control--sm" formControlName="categorieId">
              <option value="">-- Choisir --</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.nom }}</option>
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Caisse</label>
            <select class="form-control form-control--sm" formControlName="caisseId">
              <option value="">-- Choisir --</option>
              <option *ngFor="let c of caisses" [value]="c.id" [disabled]="!c.actif">
                {{ c.nom }} ({{ c.solde | number:'1.0-0' }})
              </option>
            </select>
          </div>
        </div>

        <!-- Message solde insuffisant -->
        <div class="quick-add-error" *ngIf="showSoldeError">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M7 4v3M7 9v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          Solde insuffisant ({{ selectedCaisse?.solde | number:'1.0-0' }} FCFA disponibles)
        </div>

        <!-- Bouton -->
        <button
          type="submit"
          class="quick-add-submit"
          [disabled]="loading || form.invalid || showSoldeError"
        >
          <span *ngIf="!loading">{{ submitLabel }}</span>
          <span *ngIf="loading" class="btn-spinner"></span>
        </button>

        <!-- Lien vers formulaire complet -->
        <a routerLink="/operations/nouveau" class="quick-add-full" (click)="close()">
          Formulaire complet
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </form>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 999;
    }

    /* ─── FAB ─────────────────────────────────────── */
    .quick-add-fab {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--navy-800);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(11, 22, 41, 0.3);
      transition: all var(--duration-fast);
      position: relative;
      z-index: 1000;
    }

    .quick-add-fab:hover {
      background: var(--navy-700);
      transform: scale(1.05);
      box-shadow: 0 6px 28px rgba(11, 22, 41, 0.4);
    }

    /* ─── Overlay ─────────────────────────────────── */
    .quick-add-overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 22, 41, 0.4);
      backdrop-filter: blur(2px);
      z-index: 998;
    }

    /* ─── Panneau ─────────────────────────────────── */
    .quick-add-panel {
      position: fixed;
      bottom: 100px;
      right: 28px;
      width: 380px;
      max-width: calc(100vw - 56px);
      max-height: calc(100vh - 140px);
      overflow-y: auto;
      background: var(--color-white);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      z-index: 999;
      animation: slideUp 0.3s var(--ease-out);
    }

    .quick-add-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--gray-100);
    }

    .quick-add-panel__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--navy-800);
    }

    .quick-add-panel__close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-50);
      border: 1px solid var(--gray-100);
      border-radius: var(--radius-sm);
      color: var(--gray-400);
      cursor: pointer;
      transition: all var(--duration-fast);
    }

    .quick-add-panel__close:hover {
      background: var(--gray-100);
      color: var(--gray-700);
    }

    /* ─── Formulaire ──────────────────────────────── */
    .quick-add-form {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    /* Toggle */
    .quick-add-toggle {
      display: flex;
      background: var(--gray-100);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 2px;
    }

    .quick-add-toggle__btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--gray-500);
      cursor: pointer;
      transition: all var(--duration-fast);
    }

    .quick-add-toggle__btn:hover {
      color: var(--gray-700);
    }

    .quick-add-toggle__btn--active {
      background: var(--color-white);
      color: var(--active-color);
      box-shadow: var(--shadow-xs);
    }

    /* Montant */
    .quick-add-amount {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) 0;
    }

    .quick-add-amount__input {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 2rem;
      font-weight: 700;
      color: var(--navy-900);
      border: none;
      border-bottom: 2px solid var(--gray-200);
      outline: none;
      padding: var(--space-2) 0;
      width: 100%;
      transition: border-color var(--duration-fast);
    }

    .quick-add-amount__input:focus {
      border-color: var(--navy-500);
    }

    .quick-add-amount__input::placeholder {
      color: var(--gray-300);
    }

    .quick-add-amount__currency {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--gray-400);
      flex-shrink: 0;
    }

    /* Row */
    .quick-add-row {
      display: flex;
      gap: var(--space-3);
    }

    /* Error */
    .quick-add-error {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: var(--color-danger-light);
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
      color: var(--color-danger-dark);
    }

    /* Submit */
    .quick-add-submit {
      width: 100%;
      padding: var(--space-3);
      background: var(--navy-800);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-base);
      font-weight: 600;
      cursor: pointer;
      transition: all var(--duration-fast);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .quick-add-submit:hover:not(:disabled) {
      background: var(--navy-700);
    }

    .quick-add-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Full link */
    .quick-add-full {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--gray-400);
      text-decoration: none;
      padding: var(--space-1);
    }

    .quick-add-full:hover {
      color: var(--navy-600);
    }

    @media (max-width: 500px) {
      :host { right: 16px; bottom: 20px; }
      .quick-add-panel { right: 16px; left: 16px; width: auto; }
      .quick-add-fab { width: 48px; height: 48px; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  animations: [
    trigger('fabIn', [transition(':enter', [style({ opacity: 0, transform: 'scale(0.8)' }), animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))])]),
    trigger('overlayIn', [transition(':enter', [style({ opacity: 0 }), animate('200ms ease-out', style({ opacity: 1 }))])]),
    trigger('panelIn', [transition(':enter', [style({ opacity: 0, transform: 'translateY(16px)' }), animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))])]),
  ],
})
export class QuickAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private caisseService = inject(CaisseService);
  private categorieService = inject(CategorieService);
  private opService = inject(OperationService);
  private auth = inject(AuthService);
  private vocabulaireService = inject(VocabulaireService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  @ViewChild('montantInput') montantInputRef!: ElementRef;

  isOpen = false;
  loading = false;
  caisses: Caisse[] = [];
  categories: Categorie[] = [];

  form!: FormGroup;

  get v(): VocabulaireMetier {
    return this.vocabulaireService.vocabulaire;
  }

  get panelTitle(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return this.v.entreeAction;
    if (type === 'sortie') return this.v.sortieAction;
    return 'Nouvelle opération';
  }

  get libellePlaceholder(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Ex: ${this.v.entree} de tissus, Paiement facture...`;
    return `Ex: Achat carburant, Paiement loyer...`;
  }

  get submitLabel(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Enregistrer ${this.v.entree.toLowerCase()}`;
    return `Enregistrer ${this.v.sortie.toLowerCase()}`;
  }

  get selectedCaisse(): Caisse | undefined {
    const id = this.form?.get('caisseId')?.value;
    return this.caisses.find(c => c.id === id);
  }

  get showSoldeError(): boolean {
    const type = this.form?.get('type')?.value;
    const montant = this.form?.get('montant')?.value || 0;
    if (type === 'sortie' && this.selectedCaisse && montant > this.selectedCaisse.solde) {
      return true;
    }
    return false;
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupTypeListener();
  }

  private initForm(): void {
    this.form = this.fb.group({
      type: ['sortie', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      libelle: ['', [Validators.required, Validators.minLength(3)]],
      categorieId: ['', Validators.required],
      caisseId: ['', Validators.required],
    });
  }

  private setupTypeListener(): void {
    this.form.get('type')?.valueChanges.subscribe((type: string) => {
      this.loadCategories(type);
    });
  }

  private loadData(): void {
    this.caisseService.getAll().subscribe(c => {
      this.caisses = c.filter(caisse => caisse.actif === true);
      // Présélectionner la première caisse
      if (this.caisses.length > 0 && !this.form.get('caisseId')?.value) {
        this.form.get('caisseId')?.setValue(this.caisses[0].id);
      }
    });
    this.loadCategories('sortie');
  }

  private loadCategories(type: string): void {
    this.categorieService.getByType(type as 'entree' | 'sortie').subscribe(cats => {
      this.categories = cats;
      // Présélectionner la première catégorie
      if (cats.length > 0 && !this.form.get('categorieId')?.value) {
        this.form.get('categorieId')?.setValue(cats[0].id);
      }
    });
  }

  setType(type: string): void {
    this.form.get('type')?.setValue(type);
  }

  open(): void {
    this.isOpen = true;
    this.form.reset({ type: 'sortie', caisseId: this.caisses[0]?.id || '' });
    setTimeout(() => {
      this.montantInputRef?.nativeElement?.focus();
    }, 300);
  }

  close(): void {
    this.isOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.showSoldeError) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const val = this.form.value;
    const caisse = this.selectedCaisse;
    const categorie = this.categories.find(c => c.id === val.categorieId);

    try {
      await this.opService.create({
        libelle: val.libelle,
        montant: Math.round(Number(val.montant)),
        type: val.type,
        caisseId: val.caisseId,
        caisseNom: caisse?.nom || '',
        categorieId: val.categorieId,
        categorieNom: categorie?.nom || '',
        date: new Date(),
        statut: 'validee',
        responsableId: ''
      });

      const label = val.type === 'entree' ? this.v.entree : this.v.sortie;
      this.toastr.success(`${label} enregistrée avec succès !`, 'Succès');
      this.close();
      this.form.reset({ type: val.type, caisseId: val.caisseId });
    } catch (err: any) {
      this.toastr.error(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      this.loading = false;
    }
  }
}
