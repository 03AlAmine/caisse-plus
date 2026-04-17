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
  { nom: 'Cotisation', type: 'entree', couleur: '#10B981', systeme: true },
  { nom: 'Subvention', type: 'entree', couleur: '#3B82F6', systeme: true },
  { nom: 'Don', type: 'entree', couleur: '#8B5CF6', systeme: true },
  { nom: 'Transport', type: 'sortie', couleur: '#F59E0B', systeme: true },
  { nom: 'Restauration', type: 'sortie', couleur: '#EF4444', systeme: true },
  { nom: 'Fournitures', type: 'sortie', couleur: '#F97316', systeme: true },
  { nom: 'Communication', type: 'sortie', couleur: '#06B6D4', systeme: true },
  { nom: 'Autre', type: 'les_deux', couleur: '#6B7280', systeme: true },
];
