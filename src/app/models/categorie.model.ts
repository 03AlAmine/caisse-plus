export type CategorieType = 'entree' | 'sortie' | 'les_deux';

export interface Categorie {
  id?: string;
  nom: string;
  type: CategorieType;
  couleur: string;
  icone?: string;
  organisationId: string;
  systeme?: boolean; // catégories par défaut non supprimables
}

export const CATEGORIES_DEFAUT: Omit<Categorie, 'organisationId'>[] = [
  // ── Entrées ────────────────────────────────────────────────────────────────
  { nom: 'Alimentation caisse',   type: 'entree',   couleur: '#10B981', icone: '💰', systeme: true },
  { nom: 'Cotisation',            type: 'entree',   couleur: '#3B82F6', icone: '📋', systeme: true },
  { nom: 'Subvention',            type: 'entree',   couleur: '#6366F1', icone: '🏛️', systeme: true },
  { nom: 'Don',                   type: 'entree',   couleur: '#8B5CF6', icone: '🎁', systeme: true },

  // ── Sorties — tirées des colonnes CAISSE_2026.xlsx ─────────────────────────
  { nom: 'Carburant',             type: 'sortie',   couleur: '#F59E0B', icone: '⛽', systeme: true },
  { nom: 'Crédit & Sonatel',      type: 'sortie',   couleur: '#06B6D4', icone: '📱', systeme: true },
  { nom: 'Restauration',          type: 'sortie',   couleur: '#EF4444', icone: '🍽️', systeme: true },
  { nom: 'Transport',             type: 'sortie',   couleur: '#F97316', icone: '🚗', systeme: true },
  { nom: 'Produit de nettoyage',  type: 'sortie',   couleur: '#14B8A6', icone: '🧹', systeme: true },
  { nom: 'Réparation moto',       type: 'sortie',   couleur: '#D97706', icone: '🛵', systeme: true },
  { nom: 'Réparation véhicule',   type: 'sortie',   couleur: '#B45309', icone: '🔧', systeme: true },
  { nom: 'Woyofal',               type: 'sortie',   couleur: '#7C3AED', icone: '💡', systeme: true },
  { nom: 'Fournitures bureau',    type: 'sortie',   couleur: '#2563EB', icone: '📎', systeme: true },
  { nom: 'Timbre / Banque',       type: 'sortie',   couleur: '#9333EA', icone: '🏦', systeme: true },

  // ── Commun ─────────────────────────────────────────────────────────────────
  { nom: 'Communication',         type: 'sortie',   couleur: '#0891B2', icone: '📡', systeme: true },
  { nom: 'Autre',                 type: 'les_deux', couleur: '#6B7280', icone: '📄', systeme: true },
];
