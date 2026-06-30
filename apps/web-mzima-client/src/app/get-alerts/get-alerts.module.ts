import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { GetAlertsRoutingModule } from './get-alerts-routing.module';
import { GetAlertsComponent } from './get-alerts.component';

@NgModule({
  declarations: [GetAlertsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSliderModule,
    MatSnackBarModule,
    TranslateModule,
    GetAlertsRoutingModule,
  ],
})
export class GetAlertsModule {}
