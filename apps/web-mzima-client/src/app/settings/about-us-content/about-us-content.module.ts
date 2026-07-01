import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { AboutUsContentRoutingModule } from './about-us-content-routing.module';
import { AboutUsContentComponent } from './about-us-content.component';
import { SettingsModule } from '../settings.module';

@NgModule({
  declarations: [AboutUsContentComponent],
  imports: [
    CommonModule,
    AboutUsContentRoutingModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslateModule,
    SettingsModule,
  ],
})
export class AboutUsContentModule {}
