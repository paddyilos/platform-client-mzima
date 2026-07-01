import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { MzimaUiModule } from '@mzima-client/mzima-ui';
import { DirectiveModule } from '@shared';
import { LocationSelectComponent } from './location-select.component';

@NgModule({
  declarations: [LocationSelectComponent],
  imports: [
    CommonModule,
    FormsModule,
    LeafletModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MzimaUiModule,
    DirectiveModule,
  ],
  exports: [LocationSelectComponent],
})
export class LocationSelectModule {}
