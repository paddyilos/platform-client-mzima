import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactUsService } from '@mzima-client/sdk';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
})
export class ContactUsComponent implements OnInit {
  form!: FormGroup;
  submitting = false;
  submitted = false;

  captchaNum1 = 0;
  captchaNum2 = 0;
  captchaAnswer = 0;
  captchaError = false;

  constructor(
    private fb: FormBuilder,
    private contactUsService: ContactUsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: [''],
      subject: ['', [Validators.required, Validators.maxLength(255)]],
      message: ['', [Validators.required, Validators.maxLength(5000)]],
      captcha: ['', Validators.required],
    });
    this.newCaptcha();
  }

  newCaptcha(): void {
    this.captchaNum1 = Math.floor(Math.random() * 9) + 1;
    this.captchaNum2 = Math.floor(Math.random() * 9) + 1;
    this.captchaAnswer = this.captchaNum1 + this.captchaNum2;
    this.captchaError = false;
    this.form?.get('captcha')?.reset('');
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;

    if (Number(this.form.value.captcha) !== this.captchaAnswer) {
      this.captchaError = true;
      return;
    }

    this.submitting = true;
    const payload = {
      name: this.form.value.name,
      email: this.form.value.email,
      phone_number: this.form.value.phone_number,
      subject: this.form.value.subject,
      message: this.form.value.message,
    };
    this.contactUsService.submit(payload).subscribe({
      next: () => {
        this.submitted = true;
        this.snackBar.open('Message sent successfully. We will get back to you shortly.', 'Close', {
          duration: 5000,
        });
      },
      error: () => {
        this.snackBar.open('Failed to send message. Please try again.', 'Close', {
          duration: 5000,
        });
        this.submitting = false;
        this.newCaptcha();
      },
    });
  }
}
