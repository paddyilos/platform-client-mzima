import { Component, OnInit } from '@angular/core';
import { BreakpointService, EventBusService, EventType, SessionService } from '@services';
import { BaseComponent } from '../../../../base.component';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent extends BaseComponent implements OnInit {
  public isInnerPage = false;

  constructor(
    protected override sessionService: SessionService,
    protected override breakpointService: BreakpointService,
    private eventBusService: EventBusService,
  ) {
    super(sessionService, breakpointService);
    this.checkDesktop();
    this.eventBusService.on(EventType.IsSettingsInnerPage).subscribe({
      next: (option) => {
        this.isInnerPage = Boolean(option.inner);
      },
    });
  }

  ngOnInit(): void {
    this.getUserData();
  }

  loadData(): void {}
}
