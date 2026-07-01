import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AnalysisTemplate, AnalysisTemplatesService, SurveysService } from '@mzima-client/sdk';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmModalService } from '@services';
import { RenameTemplateDialogComponent } from './rename-template-dialog/rename-template-dialog.component';

/**
 * Liberia PBO custom page — saved Analysis report template manager,
 * replacing the old UNICC fork's /dashboard/analysis-templates
 * (post-analysis.component.ts). See ushahidi-client/LIBERIA_CUSTOM.md.
 */
@Component({
  selector: 'app-analysis-templates',
  templateUrl: './analysis-templates.component.html',
  styleUrls: ['./analysis-templates.component.scss'],
})
export class AnalysisTemplatesComponent implements OnInit {
  public templates: AnalysisTemplate[] = [];
  public forms: any[] = [];

  constructor(
    private analysisTemplatesService: AnalysisTemplatesService,
    private surveysService: SurveysService,
    private router: Router,
    private dialog: MatDialog,
    private confirmModalService: ConfirmModalService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.surveysService.get().subscribe({
      next: (response: any) => {
        this.forms = response?.results ?? [];
      },
    });
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.analysisTemplatesService.list().subscribe({
      next: (response) => {
        this.templates = response?.results ?? [];
      },
    });
  }

  public surveyName(formId?: number): string {
    if (!formId) {
      return this.translate.instant('analysis.all_surveys');
    }
    return this.forms.find((form) => form.id === formId)?.name ?? formId;
  }

  public apply(template: AnalysisTemplate): void {
    this.router.navigate(['/analysis'], { queryParams: { template: template.id } });
  }

  public edit(template: AnalysisTemplate): void {
    const dialogRef = this.dialog.open(RenameTemplateDialogComponent, {
      width: '100%',
      maxWidth: '480px',
      panelClass: ['modal'],
      data: { name: template.name },
    });
    dialogRef.afterClosed().subscribe((name: string | undefined) => {
      if (!name || !template.id) {
        return;
      }
      this.analysisTemplatesService.updateTemplate(template.id, { name }).subscribe({
        next: () => this.loadTemplates(),
      });
    });
  }

  public async delete(template: AnalysisTemplate): Promise<void> {
    if (!template.id) {
      return;
    }
    const confirmed = await this.confirmModalService.open({
      title: this.translate.instant('analysis.delete_template_title'),
      description: this.translate.instant('analysis.delete_template_description'),
    });
    if (!confirmed) {
      return;
    }
    this.analysisTemplatesService.deleteTemplate(template.id).subscribe({
      next: () => this.loadTemplates(),
    });
  }
}
