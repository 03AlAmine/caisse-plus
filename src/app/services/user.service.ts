import { Injectable, inject } from '@angular/core';
import { createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import {
  Firestore, collection, collectionData, doc, updateDoc,
  query, where, orderBy, getDocs, setDoc, Timestamp, arrayUnion, getDoc,
  arrayRemove,
} from '@angular/fire/firestore';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);
  private fireAuth = inject(Auth);

  private get orgId() { return this.auth.organisationId; }

  getAll(): Observable<User[]> {
    const q = query(
      collection(this.firestore, 'users'),
      where('organisationId', '==', this.orgId),
      where('actif', '==', true),
      orderBy('displayName', 'asc'),
    );
    return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
  }

  async inviter(email: string, displayName: string, role: UserRole): Promise<void> {
    // Vérifier que l'utilisateur connecté est admin
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut inviter des membres');
    }

    // Vérifier si l'utilisateur existe déjà dans l'organisation
    const existingUserQuery = query(
      collection(this.firestore, 'users'),
      where('email', '==', email),
      where('organisationId', '==', this.orgId)
    );
    const existingUsers = await getDocs(existingUserQuery);

    if (!existingUsers.empty) {
      throw new Error('Cet utilisateur fait déjà partie de votre organisation');
    }

    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

    try {
      // Créer le compte Firebase Auth
      const credential = await createUserWithEmailAndPassword(this.fireAuth, email, tempPassword);
      const uid = credential.user.uid;
      await updateProfile(credential.user, { displayName });

      // Créer le profil Firestore
      await setDoc(doc(this.firestore, `users/${uid}`), {
        uid, email, displayName, role,
        organisationId: this.orgId,
        actif: true,
        createdAt: Timestamp.now(),
        invitedBy: this.auth.currentUser?.uid,
      });

      // Ajouter l'utilisateur à la liste des membres de l'organisation
      const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
      await updateDoc(orgRef, {
        membres: arrayUnion(uid)
      });

      // Envoyer l'email de réinitialisation du mot de passe
      await sendPasswordResetEmail(this.fireAuth, email);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // L'utilisateur existe déjà dans Firebase Auth mais pas dans l'organisation
        // On peut le rattacher à l'organisation existante
        throw new Error('Cet email est déjà utilisé. Demandez à l\'utilisateur de rejoindre l\'organisation avec un code d\'invitation.');
      }
      throw error;
    }
  }

  async changerRole(uid: string, role: UserRole): Promise<void> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut changer les rôles');
    }
    await updateDoc(doc(this.firestore, `users/${uid}`), { role });
  }

  async desactiver(uid: string): Promise<void> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut désactiver des membres');
    }

    // Ne pas désactiver soi-même
    if (uid === this.auth.currentUser?.uid) {
      throw new Error('Vous ne pouvez pas vous désactiver vous-même');
    }

    await updateDoc(doc(this.firestore, `users/${uid}`), { actif: false });

    // Retirer des membres de l'organisation
    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
    await updateDoc(orgRef, {
      membres: arrayRemove(uid)
    });
  }

  async mettreAJourProfil(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(this.firestore, `users/${uid}`), { ...data });
  }

  async getOrganisationInvitationCode(): Promise<string | null> {
    if (!this.auth.isAdmin()) return null;

    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
    const orgSnap = await getDoc(orgRef);

    if (orgSnap.exists()) {
      return orgSnap.data()['invitationCode'] || null;
    }
    return null;
  }
}
