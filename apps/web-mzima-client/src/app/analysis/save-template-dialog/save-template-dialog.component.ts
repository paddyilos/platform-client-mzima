import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-save-template-dialog',
  templateUrl: './save-template-dialog.component.html',
  styleUrls: ['./save-template-dialog.component.scss'],
})
export class SaveTemplateDialogComponent {
  public nameControl = new FormControl('', [Validators.required, Validators.maxLength(255)]);

  constructor(private dialogRef: MatDialogRef<SaveTemplateDialogComponent>) {}

  public cancel(): void {
    this.dialogRef.close();
  }

  public save(): void {
    if (this.nameControl.invalid) {
      this.nameControl.markAsTouched();
      return;
    }
    this.dialogRef.close(this.nameControl.value);
  }
}
