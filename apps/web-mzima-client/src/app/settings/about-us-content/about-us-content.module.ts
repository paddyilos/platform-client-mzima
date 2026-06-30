import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { AboutUsContentRoutingModule } from './about-us-content-routing.module';
import { AboutUsContentComponent } from './about-us-content.component';

@NgModule({
  declarations: [AboutUsContentComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslateModule,
    AboutUsContentRoutingModule,
  ],
})
export class AboutUsContentModule {}
