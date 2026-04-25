export type CategorieType = 'entree' | 'sortie' | 'les_deux';

export interface Categorie {
  id?: string;
  nom: string;
  type: CategorieType;
  couleur: string;
  icone?: string;
  organisationId: string;
  systeme?: boolean;
}

export const CATEGORIES_DEFAUT: Omit<Categorie, 'organisationId'>[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // RUBRIQUES ENTRÉES — Caisse Principale
  // ═══════════════════════════════════════════════════════════════════════
  {
    nom: 'Alimentation caisse secondaire',
    type: 'entree',
    couleur: '#10B981',
    systeme: true,
  },
  {
    nom: 'Alimentation caisse LIS sécurité',
    type: 'entree',
    couleur: '#059669',
    systeme: true,
  },
  {
    nom: 'Règlement facture',
    type: 'entree',
    couleur: '#3B82F6',
    systeme: true,
  },
  {
    nom: 'Retrait banque',
    type: 'entree',
    couleur: '#6366F1',
    systeme: true,
  },
  {
    nom: 'Cotisation',
    type: 'entree',
    couleur: '#8B5CF6',
    systeme: true,
  },
  {
    nom: 'Subvention',
    type: 'entree',
    couleur: '#7C3AED',
    systeme: true,
  },
  {
    nom: 'Don',
    type: 'entree',
    couleur: '#EC4899',
    systeme: true,
  },
  {
    nom: 'Autres (Entrée)',
    type: 'entree',
    couleur: '#6B7280',
    systeme: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RUBRIQUES SORTIES — Caisse Principale
  // ═══════════════════════════════════════════════════════════════════════
  {
    nom: 'Alimentation caisse secondaire',
    type: 'sortie',
    couleur: '#F59E0B',
    systeme: true,
  },
  {
    nom: 'Alimentation caisse LIS sécurité',
    type: 'sortie',
    couleur: '#D97706',
    systeme: true,
  },
  {
    nom: 'Débours',
    type: 'sortie',
    couleur: '#EF4444',
    systeme: true,
  },
  {
    nom: 'Impôts',
    type: 'sortie',
    couleur: '#DC2626',
    systeme: true,
  },
  {
    nom: 'CSS - IPRES',
    type: 'sortie',
    couleur: '#B91C1C',
    systeme: true,
  },
  {
    nom: 'IPM',
    type: 'sortie',
    couleur: '#F97316',
    systeme: true,
  },
  {
    nom: 'Carburant',
    type: 'sortie',
    couleur: '#EAB308',
    systeme: true,
  },
  {
    nom: 'Crédit & Sonatel',
    type: 'sortie',
    couleur: '#06B6D4',
    systeme: true,
  },
  {
    nom: 'Restauration',
    type: 'sortie',
    couleur: '#14B8A6',
    systeme: true,
  },
  {
    nom: 'Transport',
    type: 'sortie',
    couleur: '#8B5CF6',
    systeme: true,
  },
  {
    nom: 'Produit de nettoyage',
    type: 'sortie',
    couleur: '#0EA5E9',
    systeme: true,
  },
  {
    nom: 'Réparation moto',
    type: 'sortie',
    couleur: '#7C3AED',
    systeme: true,
  },
  {
    nom: 'Réparation véhicule',
    type: 'sortie',
    couleur: '#6366F1',
    systeme: true,
  },
  {
    nom: 'Woyofal',
    type: 'sortie',
    couleur: '#EC4899',
    systeme: true,
  },
  {
    nom: 'Fournitures bureau',
    type: 'sortie',
    couleur: '#2563EB',
    systeme: true,
  },
  {
    nom: 'Timbre / Banque',
    type: 'sortie',
    couleur: '#9333EA',
    systeme: true,
  },
  {
    nom: 'Communication',
    type: 'sortie',
    couleur: '#0891B2',
    systeme: true,
  },
  {
    nom: 'Autres (Sortie)',
    type: 'sortie',
    couleur: '#6B7280',
    systeme: true,
  },
];
