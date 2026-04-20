import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { FcfaPipe } from '../shared/pipes/fcfa.pipe';
import { AlertesPipe } from '../shared/pipes/alertes.pipe';
import { SumPipe } from '../shared/pipes/sum.pipe';
import { HasRoleDirective } from '../shared/directives/has-role.directive';
import { CanDoDirective } from '../shared/directives/can-do.directive';
import { LoadingSpinnerComponent } from '../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../shared/components/page-header/page-header.component';
import { ChartComponent } from '../shared/components/chart/chart.component';

@NgModule({
  declarations: [
    FcfaPipe,
    AlertesPipe,
    SumPipe,
    HasRoleDirective,
    CanDoDirective,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ChartComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    // Modules
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,

    // Pipes
    FcfaPipe,
    AlertesPipe,
    SumPipe,

    // Directives
    HasRoleDirective,
    CanDoDirective,

    // Components
    LoadingSpinnerComponent,
    PageHeaderComponent,
    ChartComponent  // ← AJOUTÉ ICI
  ],
})
export class SharedModule {}
