import { Injectable, inject } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, Permission, peutFaire } from '../models/user.model';
import { CATEGORIES_DEFAUT } from '../models/categorie.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  // true = connecté, false = déconnecté, null = en cours de vérification (splash)
  private authReadySubject = new BehaviorSubject<boolean | null>(null);
  authReady$ = this.authReadySubject.asObservable();

  isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = new Observable((observer) => {
      const unsub = onAuthStateChanged(this.auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await this.getUserProfile(firebaseUser.uid);
          this.currentUserSubject.next(profile);
          observer.next(true);
          this.authReadySubject.next(true);
        } else {
          this.currentUserSubject.next(null);
          observer.next(false);
          this.authReadySubject.next(false);
        }
      });
      return unsub;
    });

    // Démarrer l'écoute dès la construction pour pré-remplir authReady$
    this.isAuthenticated$.subscribe();
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
  get organisationId(): string {
    return this.currentUser?.organisationId ?? '';
  }
  get role(): UserRole {
    return this.currentUser?.role ?? 'utilisateur';
  }

  // ── Vérification de rôle ───────────────────────────────────────────────────
  hasRole(...roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }
  isTresorier(): boolean {
    return this.hasRole('admin', 'tresorier');
  }
  isAuditeur(): boolean {
    return this.hasRole('admin', 'tresorier', 'auditeur');
  }

  peut(permission: Permission): boolean {
    return peutFaire(this.role, permission);
  }

  // ── Auth Firebase ──────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  // Inscription avec création d'une nouvelle organisation
  async registerWithNewOrganisation(
    email: string,
    password: string,
    displayName: string,
    organisationNom: string,
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    const organisationRef = doc(collection(this.firestore, 'organisations'));

    await setDoc(organisationRef, {
      nom: organisationNom,
      ownerId: uid,
      createdAt: serverTimestamp(),
      membres: [uid],
      actif: true,
    });

    const organisationId = organisationRef.id;
    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'admin',
      organisationId: organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
    });

    // Initialiser les catégories par défaut pour la nouvelle organisation
    await this.initCategories(organisationId);
  }

  // Inscription pour rejoindre une organisation existante
  async registerToExistingOrganisation(
    email: string,
    password: string,
    displayName: string,
    organisationId: string,
    invitationCode?: string,
  ): Promise<void> {
    const orgRef = doc(this.firestore, `organisations/${organisationId}`);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error(
        "Organisation introuvable. Vérifiez le code d'invitation.",
      );
    }

    const orgData = orgSnap.data();

    if (orgData['actif'] === false) {
      throw new Error("Cette organisation n'est plus active.");
    }

    if (invitationCode && orgData['invitationCode'] !== invitationCode) {
      throw new Error("Code d'invitation invalide.");
    }

    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    await updateDoc(orgRef, {
      membres: arrayUnion(uid),
    });

    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid,
      email,
      displayName,
      role: 'utilisateur',
      organisationId: organisationId,
      actif: true,
      createdAt: serverTimestamp(),
      createdBy: uid,
      invitedBy: orgData['ownerId'],
    });
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.currentUserSubject.next(null);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async updateUserProfile(data: Partial<User>): Promise<void> {
    if (!this.currentUser) return;
    await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), {
      ...data,
    });
    this.currentUserSubject.next({ ...this.currentUser, ...data });
  }

  async generateInvitationCode(): Promise<string> {
    if (!this.isAdmin()) {
      throw new Error(
        "Seul un administrateur peut générer un code d'invitation",
      );
    }

    const invitationCode = Math.random()
      .toString(36)
      .substring(2, 15)
      .toUpperCase();
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);

    await updateDoc(orgRef, {
      invitationCode: invitationCode,
      invitationCodeGeneratedAt: serverTimestamp(),
    });

    return invitationCode;
  }

  async getCurrentOrganisation(): Promise<any> {
    if (!this.organisationId) return null;
    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    const orgSnap = await getDoc(orgRef);
    return orgSnap.exists() ? { id: orgSnap.id, ...orgSnap.data() } : null;
  }

  async quitOrganisation(): Promise<void> {
    if (!this.currentUser) return;

    const orgRef = doc(this.firestore, `organisations/${this.organisationId}`);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) return;

    const orgData = orgSnap.data();

    if (orgData['ownerId'] === this.currentUser.uid) {
      throw new Error(
        "Vous êtes le propriétaire. Transférez la propriété ou supprimez l'organisation avant de quitter.",
      );
    }

    await updateDoc(orgRef, {
      membres: arrayRemove(this.currentUser.uid),
    });

    await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), {
      actif: false,
      organisationId: null,
    });

    await this.logout();
  }

  // ── Privé ──────────────────────────────────────────────────────────────────
  private async getUserProfile(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data['uid'],
      email: data['email'],
      displayName: data['displayName'],
      role: data['role'],
      organisationId: data['organisationId'],
      actif: data['actif'],
      createdAt: data['createdAt']?.toDate() ?? new Date(),
    } as User;
  }

  private async initCategories(organisationId: string): Promise<void> {
    const catCol = collection(this.firestore, 'categories');
    for (const cat of CATEGORIES_DEFAUT) {
      await addDoc(catCol, { ...cat, organisationId });
    }
  }
}
