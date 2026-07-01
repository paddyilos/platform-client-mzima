import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AnalysisRoutingModule } from './analysis-routing.module';
import { AnalysisComponent } from './analysis.component';
import { AnalysisDashboardTabComponent } from './dashboard-tab/analysis-dashboard-tab.component';
import { AnalysisReportBuilderTabComponent } from './report-builder-tab/analysis-report-builder-tab.component';
import { SaveTemplateDialogComponent } from './save-template-dialog/save-template-dialog.component';

@NgModule({
  declarations: [
    AnalysisComponent,
    AnalysisDashboardTabComponent,
    AnalysisReportBuilderTabComponent,
    SaveTemplateDialogComponent,
  ],
  imports: [
    CommonModule,
    AnalysisRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxChartsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    TranslateModule,
  ],
})
export class AnalysisModule {}
