import { Component, OnInit } from '@angular/core';
import { ConfigService } from '@services';

export interface AboutUsSection {
  title: string;
  description: string;
}

export interface AboutUsContent {
  image?: string;
  who_we_are?: AboutUsSection;
  how_we_work?: AboutUsSection;
  donors_info?: AboutUsSection;
  logos?: string[];
  donor_logos?: string[];
}

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss'],
})
export class AboutUsComponent implements OnInit {
  loading = true;
  content: AboutUsContent = {};

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.configService.getByGroup('about_us').subscribe({
      next: (res: any) => {
        const value = res?.result?.content;
        this.content = value && typeof value === 'object' ? value : {};
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get hasContent(): boolean {
    return !!(this.content.who_we_are || this.content.how_we_work || this.content.donors_info);
  }
}
