import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.component.html',
  styleUrls: ['./parametres.component.scss'],
})
export class ParametresComponent implements OnInit {
  auth = inject(AuthService);
  private userService = inject(UserService);

  pendingInvitations = 0;

  ngOnInit(): void {
    this.loadPendingInvitations();
  }

  private loadPendingInvitations(): void {
    this.userService.getAll().subscribe(users => {
      // Compter les utilisateurs récemment invités (optionnel)
      this.pendingInvitations = 0;
    });
  }
}
