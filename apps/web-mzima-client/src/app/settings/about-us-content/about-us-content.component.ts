import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MediaService } from '@mzima-client/sdk';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-about-us-content',
  templateUrl: './about-us-content.component.html',
  styleUrls: ['./about-us-content.component.scss'],
})
export class AboutUsContentComponent implements OnInit {
  form!: FormGroup;
  loading = true;
  saving = false;

  image = '';
  logos: string[] = [];
  donorLogos: string[] = [];

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService,
    private mediaService: MediaService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      who_we_are_title: [''],
      who_we_are_description: [''],
      how_we_work_title: [''],
      how_we_work_description: [''],
      donors_title: [''],
      donors_description: [''],
    });

    this.configService.getByGroup('about_us').subscribe({
      next: (res: any) => {
        const content = res?.result?.content;
        if (content && typeof content === 'object') {
          this.form.patchValue({
            who_we_are_title: content.who_we_are?.title ?? '',
            who_we_are_description: content.who_we_are?.description ?? '',
            how_we_work_title: content.how_we_work?.title ?? '',
            how_we_work_description: content.how_we_work?.description ?? '',
            donors_title: content.donors_info?.title ?? '',
            donors_description: content.donors_info?.description ?? '',
          });
          this.image = content.image ?? '';
          this.logos = content.logos ?? [];
          this.donorLogos = content.donor_logos ?? [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private resolveMediaUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return this.mediaService.backendUrl.replace(/\/$/, '') + url;
  }

  headerImageUploaded(event: any): void {
    this.mediaService.uploadFile(event.file).subscribe((response: any) => {
      this.image = this.resolveMediaUrl(response.result.original_file_url);
    });
  }

  headerImageDeleted(): void {
    this.image = '';
  }

  logoUploaded(event: any): void {
    this.mediaService.uploadFile(event.file).subscribe((response: any) => {
      this.logos = [...this.logos, this.resolveMediaUrl(response.result.original_file_url)];
    });
  }

  logoDeleted(index: number): void {
    this.logos = this.logos.filter((_, i) => i !== index);
  }

  donorLogoUploaded(event: any): void {
    this.mediaService.uploadFile(event.file).subscribe((response: any) => {
      this.donorLogos = [
        ...this.donorLogos,
        this.resolveMediaUrl(response.result.original_file_url),
      ];
    });
  }

  donorLogoDeleted(index: number): void {
    this.donorLogos = this.donorLogos.filter((_, i) => i !== index);
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    const v = this.form.value;
    const content = {
      image: this.image,
      who_we_are: { title: v.who_we_are_title, description: v.who_we_are_description },
      how_we_work: { title: v.how_we_work_title, description: v.how_we_work_description },
      donors_info: { title: v.donors_title, description: v.donors_description },
      logos: this.logos,
      donor_logos: this.donorLogos,
    };
    this.configService.update('about_us', { content }).subscribe({
      next: () => {
        this.saving = false;
        this.snackBar.open('About Us content saved.', 'Close', { duration: 5000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save. Please try again.', 'Close', { duration: 5000 });
      },
    });
  }
}
