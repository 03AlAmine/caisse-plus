import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { FcfaPipe } from '../shared/pipes/fcfa.pipe';
import { AlertesPipe } from '../shared/pipes/alertes.pipe';
import { HasRoleDirective } from '../shared/directives/has-role.directive';
import { CanDoDirective } from '../shared/directives/can-do.directive';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';

@NgModule({
  declarations: [
    FcfaPipe,
    AlertesPipe,
    HasRoleDirective,
    CanDoDirective,
    LoadingSpinnerComponent,
    PageHeaderComponent,
  ],
  imports: [CommonModule, RouterModule],
  exports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    FcfaPipe,
    AlertesPipe,
    HasRoleDirective,
    CanDoDirective,
    LoadingSpinnerComponent,
    PageHeaderComponent,
  ],
})
export class SharedModule {}
