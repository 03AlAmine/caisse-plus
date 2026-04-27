import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from './shared.module';
import { ProfilComponent } from '../features/profil/profil.component';

const routes: Routes = [
  { path: '', component: ProfilComponent },
];

@NgModule({
  declarations: [ProfilComponent],
  imports: [SharedModule, RouterModule.forChild(routes)],
})
export class ProfilModule {}
