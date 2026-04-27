export type CaisseType = 'principale' | 'secondaire';

export interface Caisse {
  id?: string;
  nom: string;
  description?: string;
  type: 'principale' | 'secondaire' | 'libre'; // Rétrocompatible
  role?: string;        // Rôle métier : "Boutique", "Dépôt", "Cuisine", etc.
  couleur: string;
  solde: number;
  organisationId: string;
  responsableNom?: string;
  actif: boolean;
  createdAt: any;
}

// Helper pour obtenir le label du rôle
export function getRoleLabel(caisse: Caisse, template?: any): string {
  // Si un rôle personnalisé est défini, l'utiliser
  if (caisse.role) return caisse.role;

  // Sinon, fallback sur le type
  if (caisse.type === 'principale') return 'Principale';
  if (caisse.type === 'secondaire') return 'Secondaire';
  return 'Caisse';
}

// Helper pour obtenir la couleur du badge rôle
export function getRoleBadgeClass(caisse: Caisse): string {
  if (caisse.role) return 'badge--navy';
  if (caisse.type === 'principale') return 'badge--navy';
  if (caisse.type === 'secondaire') return 'badge--gray';
  return 'badge--gray';
}
