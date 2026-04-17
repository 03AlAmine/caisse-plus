import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, updateDoc,
  query, where, orderBy, getDocs, setDoc, Timestamp,
} from '@angular/fire/firestore';
import {
  Auth, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail,
} from '@angular/fire/auth';
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
    // Créer le compte Firebase Auth avec un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const credential = await createUserWithEmailAndPassword(this.fireAuth, email, tempPassword);
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    // Créer le profil Firestore
    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid, email, displayName, role,
      organisationId: this.orgId,
      actif: true,
      createdAt: Timestamp.now(),
    });

    // Envoyer l'email de réinitialisation du mot de passe
    await sendPasswordResetEmail(this.fireAuth, email);
  }

  async changerRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(this.firestore, `users/${uid}`), { role });
  }

  async desactiver(uid: string): Promise<void> {
    await updateDoc(doc(this.firestore, `users/${uid}`), { actif: false });
  }

  async mettreAJourProfil(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(this.firestore, `users/${uid}`), { ...data });
  }
}
