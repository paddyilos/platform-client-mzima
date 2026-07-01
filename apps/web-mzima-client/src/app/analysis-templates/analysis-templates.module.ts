import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { AnalysisTemplatesRoutingModule } from './analysis-templates-routing.module';
import { AnalysisTemplatesComponent } from './analysis-templates.component';
import { RenameTemplateDialogComponent } from './rename-template-dialog/rename-template-dialog.component';

@NgModule({
  declarations: [AnalysisTemplatesComponent, RenameTemplateDialogComponent],
  imports: [
    CommonModule,
    AnalysisTemplatesRoutingModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    TranslateModule,
  ],
})
export class AnalysisTemplatesModule {}
