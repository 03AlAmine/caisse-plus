import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, query, where, orderBy,
  addDoc, updateDoc, deleteDoc, doc, writeBatch, Timestamp, getDocs, limit,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id?: string;
  message: string;
  detail?: string;          // ligne secondaire
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  userId: string;
  organisationId: string;
  link?: string;            // route Angular vers laquelle naviguer au clic
  createdAt: any;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);
  private auth      = inject(AuthService);

  private get col() { return collection(this.firestore, 'notifications'); }

  // ── Lecture ────────────────────────────────────────────────────────────────

  getNotifications(max = 30): Observable<Notification[]> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return of([]);

    const q = query(
      this.col,
      where('userId',         '==', userId),
      where('organisationId', '==', this.auth.organisationId),
      orderBy('createdAt', 'desc'),
      limit(max),
    );

    return (collectionData(q, { idField: 'id' }) as Observable<Notification[]>).pipe(
      catchError(() => of([]))
    );
  }

  getUnreadCount(): Observable<number> {
    return this.getNotifications().pipe(
      map(notifs => notifs.filter(n => !n.read).length)
    );
  }

  // ── Écriture pour l'utilisateur courant ───────────────────────────────────

  async add(
    message: string,
    type: Notification['type'] = 'info',
    options: { detail?: string; link?: string } = {},
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    await this._push(user.uid, message, type, options);
  }

  // ── Écriture pour tous les trésoriers + admins de l'organisation ──────────
  // Utilisé pour alerter les validateurs qu'une opération attend leur action

  async notifierTresoriers(
    message: string,
    type: Notification['type'] = 'warning',
    options: { detail?: string; link?: string } = {},
  ): Promise<void> {
    const orgId = this.auth.organisationId;
    if (!orgId) return;

    // Récupérer tous les admins et trésoriers actifs de l'organisation
    const q = query(
      collection(this.firestore, 'users'),
      where('organisationId', '==', orgId),
      where('actif',          '==', true),
    );
    const snap = await getDocs(q);

    // Filtrer côté client (Firestore ne supporte pas 'in' combiné avec d'autres filtres facilement)
    const destinataires = snap.docs
      .map(d => d.data())
      .filter(u => ['admin', 'tresorier'].includes(u['role']))
      .map(u => u['uid'] as string)
      // Exclure l'auteur de l'action (il n'a pas besoin d'être notifié de sa propre opération)
      .filter(uid => uid !== this.auth.currentUser?.uid);

    // Écriture en batch pour performance
    const batch = writeBatch(this.firestore);
    const now   = Timestamp.now();

    for (const uid of destinataires) {
      const ref = doc(this.col);
      batch.set(ref, {
        message,
        detail:         options.detail ?? null,
        link:           options.link   ?? null,
        type,
        read:           false,
        userId:         uid,
        organisationId: orgId,
        createdAt:      now,
      });
    }

    if (destinataires.length > 0) {
      await batch.commit();
    }
  }

  // ── Marquer comme lu ──────────────────────────────────────────────────────

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `notifications/${notificationId}`), { read: true });
  }

  async markAllAsRead(): Promise<void> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      this.col,
      where('userId', '==', userId),
      where('read',   '==', false),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(this.firestore);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  async delete(notificationId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `notifications/${notificationId}`));
  }

  async deleteAll(): Promise<void> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      this.col,
      where('userId',         '==', userId),
      where('organisationId', '==', this.auth.organisationId),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(this.firestore);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  // ── Privé ─────────────────────────────────────────────────────────────────

  private async _push(
    userId: string,
    message: string,
    type: Notification['type'],
    options: { detail?: string; link?: string },
  ): Promise<void> {
    await addDoc(this.col, {
      message,
      detail:         options.detail ?? null,
      link:           options.link   ?? null,
      type,
      read:           false,
      userId,
      organisationId: this.auth.organisationId,
      createdAt:      Timestamp.now(),
    });
  }
}
