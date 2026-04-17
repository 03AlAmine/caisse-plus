import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
} from '@angular/fire/auth';
import {
  Firestore, doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole, Permission, peutFaire } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = new Observable(observer => {
      const unsub = onAuthStateChanged(this.auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await this.getUserProfile(firebaseUser.uid);
          this.currentUserSubject.next(profile);
          observer.next(true);
        } else {
          this.currentUserSubject.next(null);
          observer.next(false);
        }
      });
      return unsub;
    });
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  get currentUser(): User | null { return this.currentUserSubject.value; }
  get organisationId(): string   { return this.currentUser?.organisationId ?? ''; }
  get role(): UserRole           { return this.currentUser?.role ?? 'utilisateur'; }

  // ── Vérification de rôle ───────────────────────────────────────────────────
  hasRole(...roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  // Raccourcis hiérarchiques
  isAdmin(): boolean      { return this.hasRole('admin'); }
  isTresorier(): boolean  { return this.hasRole('admin', 'tresorier'); }
  isAuditeur(): boolean   { return this.hasRole('admin', 'tresorier', 'auditeur'); }

  // Vérification par permission nommée
  peut(permission: Permission): boolean {
    return peutFaire(this.role, permission);
  }

  // ── Auth Firebase ──────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(
    email: string,
    password: string,
    displayName: string,
    organisationNom: string,
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName });

    // orgId = uid du fondateur (simplifié, 1 org par compte fondateur)
    await setDoc(doc(this.firestore, `organisations/${uid}`), {
      nom: organisationNom,
      ownerId: uid,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid, email, displayName,
      role: 'admin',
      organisationId: uid,
      actif: true,
      createdAt: serverTimestamp(),
    });
  }

  async logout(): Promise<void> { await signOut(this.auth); }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async updateUserProfile(data: Partial<User>): Promise<void> {
    if (!this.currentUser) return;
    await updateDoc(doc(this.firestore, `users/${this.currentUser.uid}`), { ...data });
    this.currentUserSubject.next({ ...this.currentUser, ...data });
  }

  // ── Privé ──────────────────────────────────────────────────────────────────
  private async getUserProfile(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ...data,
      createdAt: data['createdAt']?.toDate() ?? new Date(),
    } as User;
  }
}
