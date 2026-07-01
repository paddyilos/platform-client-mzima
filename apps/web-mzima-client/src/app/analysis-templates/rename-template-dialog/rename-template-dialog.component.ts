import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RenameTemplateDialogData {
  name: string;
}

@Component({
  selector: 'app-rename-template-dialog',
  templateUrl: './rename-template-dialog.component.html',
  styleUrls: ['./rename-template-dialog.component.scss'],
})
export class RenameTemplateDialogComponent {
  public nameControl: FormControl;

  constructor(
    private dialogRef: MatDialogRef<RenameTemplateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RenameTemplateDialogData,
  ) {
    this.nameControl = new FormControl(data.name, [Validators.required, Validators.maxLength(255)]);
  }

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
