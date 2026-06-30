import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GetAlertsComponent } from './get-alerts.component';

const routes: Routes = [{ path: '', component: GetAlertsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GetAlertsRoutingModule {}
