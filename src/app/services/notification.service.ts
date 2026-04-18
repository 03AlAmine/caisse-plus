import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, query, where, orderBy,
  addDoc, updateDoc, doc, writeBatch, Timestamp, getDocs,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id?: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  userId: string;
  organisationId: string;
  createdAt: any;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  getNotifications(): Observable<Notification[]> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return of([]);

    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', userId),
      where('organisationId', '==', this.auth.organisationId),
      orderBy('createdAt', 'desc'),
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

  async addNotification(message: string, type: 'info' | 'warning' | 'success' = 'info'): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;

    await addDoc(collection(this.firestore, 'notifications'), {
      message,
      type,
      read: false,
      userId: user.uid,
      organisationId: this.auth.organisationId,
      createdAt: Timestamp.now(),
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `notifications/${notificationId}`), { read: true });
  }

  async markAllAsRead(): Promise<void> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    // Utiliser un batch pour toutes les mises à jour en une seule opération
    const batch = writeBatch(this.firestore);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
}
