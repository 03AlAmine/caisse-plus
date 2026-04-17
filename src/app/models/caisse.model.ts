export type CaisseType = 'principale' | 'secondaire';

export interface Caisse {
  id?: string;
  nom: string;
  description?: string;
  type: CaisseType;
  solde: number;
  organisationId: string;
  responsableId?: string;
  responsableNom?: string;
  couleur?: string;
  createdAt: Date;
  updatedAt?: Date;
  actif: boolean;
}
