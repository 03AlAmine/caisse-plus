// notification.service.ts
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, orderBy, addDoc, updateDoc, doc, Timestamp } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id?: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  userId: string;
  organisationId: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  getNotifications(): Observable<Notification[]> {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return new Observable();

    const q = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', userId),
      where('organisationId', '==', this.auth.organisationId),
      orderBy('createdAt', 'desc'),
      orderBy('read', 'asc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(data => data as Notification[])
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
      createdAt: Timestamp.now()
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `notifications/${notificationId}`), {
      read: true
    });
  }

  async markAllAsRead(): Promise<void> {
    const notifications = await this.getNotifications().toPromise();
    if (!notifications) return;

    const promises = notifications.map(n =>
      updateDoc(doc(this.firestore, `notifications/${n.id}`), { read: true })
    );
    await Promise.all(promises);
  }
}
