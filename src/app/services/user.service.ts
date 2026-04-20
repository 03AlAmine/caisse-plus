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

export interface InvitationOptions {
  sendEmail?: boolean;        // Envoyer un email de bienvenue ?
  password?: string;          // Mot de passe défini par l'admin (sinon généré)
  skipEmailVerification?: boolean; // Ne pas exiger de vérification d'email
}

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

  /**
   * Invite un utilisateur avec options flexibles.
   *
   * @param email - Email de l'utilisateur
   * @param displayName - Nom complet
   * @param role - Rôle (admin, tresorier, auditeur, utilisateur)
   * @param options - Options d'invitation
   */
  async inviter(
    email: string,
    displayName: string,
    role: UserRole,
    options: InvitationOptions = { sendEmail: true }
  ): Promise<{ uid: string; tempPassword?: string }> {
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

    // Générer ou utiliser le mot de passe fourni
    const password = options.password || this._generateSecurePassword();
    let uid: string;

    try {
      // Créer le compte Firebase Auth
      const credential = await createUserWithEmailAndPassword(this.fireAuth, email, password);
      uid = credential.user.uid;
      await updateProfile(credential.user, { displayName });

      // Créer le profil Firestore
      await setDoc(doc(this.firestore, `users/${uid}`), {
        uid,
        email,
        displayName,
        role,
        organisationId: this.orgId,
        actif: true,
        emailVerified: !options.skipEmailVerification,
        createdAt: Timestamp.now(),
        invitedBy: this.auth.currentUser?.uid,
        invitedAt: Timestamp.now(),
      });

      // Ajouter l'utilisateur à la liste des membres de l'organisation
      const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
      await updateDoc(orgRef, {
        membres: arrayUnion(uid)
      });

      // Envoyer l'email de bienvenue si demandé
      if (options.sendEmail) {
        await sendPasswordResetEmail(this.fireAuth, email);
      }

      return {
        uid,
        tempPassword: options.sendEmail ? undefined : password
      };

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // L'utilisateur existe déjà dans Firebase Auth
        // On pourrait le rattacher à l'organisation existante
        throw new Error(
          'Cet email est déjà utilisé. L\'utilisateur doit rejoindre l\'organisation avec un code d\'invitation.'
        );
      }
      throw error;
    }
  }

  /**
   * Ajoute un utilisateur existant (déjà dans Firebase Auth) à l'organisation.
   * Utile quand l'utilisateur a déjà un compte mais n'est pas dans l'org.
   */
  async addExistingUser(
    email: string,
    role: UserRole,
    displayName?: string
  ): Promise<void> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut ajouter des membres');
    }

    // Rechercher l'utilisateur par email dans Firestore
    const usersQuery = query(
      collection(this.firestore, 'users'),
      where('email', '==', email)
    );
    const usersSnap = await getDocs(usersQuery);

    if (usersSnap.empty) {
      throw new Error('Aucun utilisateur trouvé avec cet email');
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    // Vérifier s'il est déjà dans l'organisation
    if (userData['organisationId'] === this.orgId) {
      throw new Error('Cet utilisateur fait déjà partie de votre organisation');
    }

    // Mettre à jour le rôle et l'organisation
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      role,
      organisationId: this.orgId,
      actif: true,
      addedBy: this.auth.currentUser?.uid,
      addedAt: Timestamp.now(),
    });

    if (displayName) {
      await updateDoc(doc(this.firestore, `users/${uid}`), { displayName });
    }

    // Ajouter à la liste des membres
    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
    await updateDoc(orgRef, {
      membres: arrayUnion(uid)
    });
  }

  /**
   * Génère un code d'invitation pour que les utilisateurs puissent rejoindre.
   */
  async generateInvitationCode(): Promise<string> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut générer un code d\'invitation');
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);

    await updateDoc(orgRef, {
      invitationCode: code,
      invitationCodeExpiresAt: Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      ),
    });

    return code;
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

    if (uid === this.auth.currentUser?.uid) {
      throw new Error('Vous ne pouvez pas vous désactiver vous-même');
    }

    await updateDoc(doc(this.firestore, `users/${uid}`), { actif: false });

    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
    await updateDoc(orgRef, {
      membres: arrayRemove(uid)
    });
  }

  async reactiver(uid: string): Promise<void> {
    if (!this.auth.isAdmin()) {
      throw new Error('Seul un administrateur peut réactiver des membres');
    }

    await updateDoc(doc(this.firestore, `users/${uid}`), { actif: true });

    const orgRef = doc(this.firestore, `organisations/${this.orgId}`);
    await updateDoc(orgRef, {
      membres: arrayUnion(uid)
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
      const data = orgSnap.data();
      const expiresAt = data['invitationCodeExpiresAt']?.toDate();

      if (expiresAt && expiresAt < new Date()) {
        return null; // Code expiré
      }

      return data['invitationCode'] || null;
    }
    return null;
  }

  private _generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
