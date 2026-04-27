import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MainLayoutComponent } from '../layout/main-layout/main-layout.component';
import { SidebarComponent } from '../layout/sidebar/sidebar.component';
import { TopbarComponent } from '../layout/topbar/topbar.component';
import { SharedModule } from "./shared.module";


@NgModule({
  declarations: [MainLayoutComponent, SidebarComponent, TopbarComponent],
  imports: [CommonModule, RouterModule, FormsModule, SharedModule],
  exports: [MainLayoutComponent],
})
export class LayoutModule {}
