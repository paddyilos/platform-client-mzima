import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnalysisTemplatesComponent } from './analysis-templates.component';

const routes: Routes = [{ path: '', component: AnalysisTemplatesComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalysisTemplatesRoutingModule {}
