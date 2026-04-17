export type OperationType = 'entree' | 'sortie' | 'transfert';
export type OperationStatut = 'validee' | 'en_attente' | 'rejetee';

export interface Operation {
  id?: string;
  libelle: string;
  montant: number;
  type: OperationType;
  statut: OperationStatut;
  caisseId: string;
  caisseNom?: string;
  categorieId?: string;
  categorieNom?: string;
  responsableId: string;
  responsableNom?: string;
  date: Date;
  createdAt: Date;
  updatedAt?: Date;
  justificatifs?: string[];
  notes?: string;
  transfertCaisseDestId?: string;
  transfertCaisseDestNom?: string;
  organisationId: string;
}
