import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
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
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-quick-add',
  template: `
    <!-- Bouton flottant -->
    <button class="quick-add-fab" (click)="open()" *ngIf="!isOpen" @fabIn>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <!-- Overlay -->
    <div
      class="quick-add-overlay"
      *ngIf="isOpen"
      @overlayIn
      (click)="close()"
    ></div>

    <!-- Panneau -->
    <div class="quick-add-panel" *ngIf="isOpen" @panelIn>
      <div class="quick-add-panel__header">
        <div class="quick-add-panel__title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3v14M3 10h14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ panelTitle }}</span>
        </div>
        <button class="quick-add-panel__close" (click)="close()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="quick-add-form">
        <!-- Toggle Entrée/Sortie -->
        <div class="quick-add-toggle">
          <button
            type="button"
            class="quick-add-toggle__btn"
            [class.quick-add-toggle__btn--active]="
              form.get('type')?.value === 'entree'
            "
            [style.--active-color]="'var(--color-success)'"
            (click)="setType('entree')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 14V2M2 8l6-6 6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ v.entree }}
          </button>
          <button
            type="button"
            class="quick-add-toggle__btn"
            [class.quick-add-toggle__btn--active]="
              form.get('type')?.value === 'sortie'
            "
            [style.--active-color]="'var(--color-danger)'"
            (click)="setType('sortie')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v12M2 8l6 6 6-6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
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

        <!-- ✅ Caisse — Grille visuelle -->
        <div class="form-group">
          <label class="form-label">Caisse</label>
          <div class="quick-caisse-grid">
            <button
              type="button"
              class="quick-caisse-card"
              *ngFor="let c of caisses"
              [class.quick-caisse-card--active]="
                form.get('caisseId')?.value === c.id
              "
              [class.quick-caisse-card--warning]="
                form.get('type')?.value === 'sortie' &&
                c.solde < (form.get('montant')?.value || 0)
              "
              (click)="selectCaisse(c)"
            >
              <span
                class="quick-caisse-card__dot"
                [style.background]="c.couleur || 'var(--gray-400)'"
              ></span>
              <span class="quick-caisse-card__name">{{ c.nom }}</span>
              <span class="quick-caisse-card__solde">{{
                c.solde | number: '1.0-0'
              }}</span>
              <span
                class="quick-caisse-card__check"
                *ngIf="form.get('caisseId')?.value === c.id"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="6" fill="var(--navy-600)" />
                  <path
                    d="M3 6L5 8.5L9 4"
                    stroke="white"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- ✅ Catégorie — Grille visuelle -->
        <div class="form-group">
          <label class="form-label">Catégorie</label>
          <div class="quick-cat-grid">
            <button
              type="button"
              class="quick-cat-card"
              *ngFor="let cat of visibleCategories"
              [class.quick-cat-card--active]="
                form.get('categorieId')?.value === cat.id
              "
              [class.quick-cat-card--entree]="cat.type === 'entree'"
              [class.quick-cat-card--sortie]="cat.type === 'sortie'"
              (click)="selectCategorie(cat)"
            >
              <span
                class="quick-cat-card__color"
                [style.background]="cat.couleur"
              ></span>
              <span class="quick-cat-card__name">{{ cat.nom }}</span>
              <span
                class="quick-cat-card__check"
                *ngIf="form.get('categorieId')?.value === cat.id"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="6" fill="var(--navy-600)" />
                  <path
                    d="M3 6L5 8.5L9 4"
                    stroke="white"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
            </button>
          </div>
          <button
            type="button"
            class="role-show-all"
            *ngIf="categories.length > 6"
            (click)="showAllCategories = !showAllCategories"
          >
            {{
              showAllCategories
                ? 'Réduire'
                : '+' + (categories.length - 6) + ' autres'
            }}
          </button>
        </div>

        <!-- Message solde insuffisant -->
        <div class="quick-add-error" *ngIf="showSoldeError">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="5.5"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <path
              d="M7 4v3M7 9v.5"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
          Solde insuffisant ({{ selectedCaisse?.solde | number: '1.0-0' }} FCFA
          disponibles)
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
        <a
          routerLink="/operations/nouveau"
          class="quick-add-full"
          (click)="close()"
        >
          Formulaire complet
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 6h6M6 3l3 3-3 3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 999;
      }

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

      .quick-add-overlay {
        position: fixed;
        inset: 0;
        background: rgba(11, 22, 41, 0.4);
        backdrop-filter: blur(2px);
        z-index: 998;
      }

      .quick-add-panel {
        position: fixed;
        bottom: 100px;
        right: 28px;
        width: 400px;
        max-width: calc(100vw - 32px);
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
      }
      .quick-add-panel__close:hover {
        background: var(--gray-100);
        color: var(--gray-700);
      }

      .quick-add-form {
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

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
        padding: var(--space-2);
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--gray-500);
        cursor: pointer;
      }
      .quick-add-toggle__btn:hover {
        color: var(--gray-700);
      }
      .quick-add-toggle__btn--active {
        background: var(--color-white);
        color: var(--active-color);
        box-shadow: var(--shadow-xs);
      }

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

      /* ✅ Grille caisses */
      .quick-caisse-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-1);
      }
      .quick-caisse-card {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-2);
        background: var(--color-white);
        border: 1.5px solid var(--gray-200);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
      }
      .quick-caisse-card:hover {
        border-color: var(--navy-400);
        background: var(--navy-50);
      }
      .quick-caisse-card--active {
        border-color: var(--navy-600);
        background: var(--navy-50);
        padding-right: var(--space-6);
      }
      .quick-caisse-card--warning {
        border-color: var(--color-warning);
        background: var(--color-warning-light);
      }
      .quick-caisse-card__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .quick-caisse-card__name {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--gray-800);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .quick-caisse-card__solde {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--gray-500);
        flex-shrink: 0;
      }
      .quick-caisse-card__check {
        position: absolute;
        right: var(--space-2);
        top: 50%;
        transform: translateY(-50%);
      }

      /* ✅ Grille catégories */
      .quick-cat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--space-1);
      }
      .quick-cat-card {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-2) var(--space-2);
        background: var(--color-white);
        border: 1.5px solid var(--gray-200);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
      }
      .quick-cat-card:hover {
        border-color: var(--navy-400);
        background: var(--navy-50);
      }
      .quick-cat-card--active {
        border-color: var(--navy-600);
        background: var(--navy-50);
        padding-right: var(--space-6);
      }
      .quick-cat-card--entree {
        border-left: 3px solid var(--color-success);
      }
      .quick-cat-card--sortie {
        border-left: 3px solid var(--color-danger);
      }
      .quick-cat-card__color {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .quick-cat-card__name {
        font-size: 10px;
        font-weight: 600;
        color: var(--gray-800);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .quick-cat-card__check {
        position: absolute;
        right: var(--space-1);
        top: 50%;
        transform: translateY(-50%);
      }

      .role-show-all {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-2);
        margin-top: var(--space-1);
        background: none;
        border: none;
        font-size: 10px;
        font-weight: 600;
        color: var(--navy-600);
        cursor: pointer;
      }
      .role-show-all:hover {
        background: var(--navy-50);
        border-radius: var(--radius-sm);
      }

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
        :host {
          right: 16px;
          bottom: 80px;
        }
        .quick-add-panel {
          right: 16px;
          left: 16px;
          width: auto;
        }
        .quick-add-fab {
          width: 48px;
          height: 48px;
        }
        .quick-caisse-grid {
          grid-template-columns: 1fr;
        }
        .quick-cat-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  animations: [
    trigger('fabIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('overlayIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('panelIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate(
          '250ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
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
  showAllCategories = false;

  form!: FormGroup;

  get v(): VocabulaireMetier {
    return this.vocabulaireService.vocabulaire;
  }
  get panelTitle(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return this.v.entreeAction;
    return this.v.sortieAction;
  }
  get libellePlaceholder(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Ex: ${this.v.entree} de tissus...`;
    return `Ex: Achat carburant...`;
  }
  get submitLabel(): string {
    const type = this.form?.get('type')?.value;
    if (type === 'entree') return `Enregistrer ${this.v.entree.toLowerCase()}`;
    return `Enregistrer ${this.v.sortie.toLowerCase()}`;
  }
  get selectedCaisse(): Caisse | undefined {
    const id = this.form?.get('caisseId')?.value;
    return this.caisses.find((c) => c.id === id);
  }
  get showSoldeError(): boolean {
    const type = this.form?.get('type')?.value;
    const montant = this.form?.get('montant')?.value || 0;
    if (
      type === 'sortie' &&
      this.selectedCaisse &&
      montant > this.selectedCaisse.solde
    )
      return true;
    return false;
  }

  get visibleCategories(): Categorie[] {
    if (this.showAllCategories) return this.categories;
    return this.categories.slice(0, 6);
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
    this.form
      .get('type')
      ?.valueChanges.subscribe((type: string) => this.loadCategories(type));
  }

  private loadData(): void {
    this.caisseService
      .getAll()
      .pipe(take(1))
      .subscribe((c) => {
        this.caisses = c.filter((caisse) => caisse.actif === true);
        if (this.caisses.length > 0 && !this.form.get('caisseId')?.value)
          this.form.get('caisseId')?.setValue(this.caisses[0].id);
      });
    this.loadCategories('sortie');
  }

  private loadCategories(type: string): void {
    this.categorieService
      .getByType(type as 'entree' | 'sortie')
      .pipe(take(1))
      .subscribe((cats) => {
        this.categories = cats;
        if (cats.length > 0 && !this.form.get('categorieId')?.value)
          this.form.get('categorieId')?.setValue(cats[0].id);
      });
  }

  selectCaisse(c: Caisse): void {
    this.form.get('caisseId')?.setValue(c.id);
  }
  selectCategorie(cat: Categorie): void {
    this.form.get('categorieId')?.setValue(cat.id);
  }

  setType(type: string): void {
    this.form.get('type')?.setValue(type);
  }

  open(): void {
    this.isOpen = true;
    this.form.reset({ type: 'sortie', caisseId: this.caisses[0]?.id || '' });
    setTimeout(() => this.montantInputRef?.nativeElement?.focus(), 300);
  }
  close(): void {
    this.isOpen = false;
    this.showAllCategories = false;
  }

  @HostListener('document:keydown.escape') onEscape(): void {
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
    const categorie = this.categories.find((c) => c.id === val.categorieId);
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
      this.toastr.error(err.message || 'Erreur');
    } finally {
      this.loading = false;
    }
  }
}
