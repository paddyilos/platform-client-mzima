import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
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

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      content: ['', [Validators.maxLength(20000)]],
    });

    this.configService.getByGroup('about_us').subscribe({
      next: (res: any) => {
        this.form.patchValue({ content: res?.result?.content ?? '' });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.configService.update('about_us', { content: this.form.value.content }).subscribe({
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
