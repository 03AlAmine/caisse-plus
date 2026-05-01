export type OperationType = 'entree' | 'sortie' | 'transfert';
export type OperationStatut = 'validee' | 'en_attente' | 'rejetee';
export type OperationSens = 'entree' | 'sortie'; // direction réelle d'un transfert

export interface Operation {
  id?: string;
  numeroPiece?: string;
  libelle: string;
  montant: number;
  type: OperationType;
  sens?: OperationSens;
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
  updatedBy?: string;
  motifRejet?: string; 
  justificatifs?: string[];
  notes?: string;
  transfertCaisseDestId?: string;
  transfertCaisseDestNom?: string;
  organisationId: string;
}
