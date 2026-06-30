import { Component, OnInit } from '@angular/core';
import { ConfigService } from '@services';

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss'],
})
export class AboutUsComponent implements OnInit {
  loading = true;
  content = '';

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.configService.getByGroup('about_us').subscribe({
      next: (res: any) => {
        this.content = res?.result?.content ?? '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
