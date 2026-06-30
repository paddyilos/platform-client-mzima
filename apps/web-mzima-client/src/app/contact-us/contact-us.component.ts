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
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.contactUsService.submit(this.form.value).subscribe({
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
      },
    });
  }
}
