import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { IncidentStatus, PostResult, PostsService } from '@mzima-client/sdk';

// Liberia PBO custom component — admin-only "Incident Status" control, kept
// fully separate from the stock Publish/Put-under-review/Archive menu so the
// two remain independently settable. See LIBERIA_CUSTOM.md.
@Component({
  selector: 'app-incident-status',
  templateUrl: './incident-status.component.html',
  styleUrls: ['./incident-status.component.scss'],
})
export class IncidentStatusComponent implements OnChanges {
  @Input() public post: PostResult;
  @Output() statusChanged = new EventEmitter<PostResult>();

  public readonly IncidentStatus = IncidentStatus;
  public readonly incidentStatuses = [
    {
      value: IncidentStatus.VerificationInProgress,
      name: 'incident_status.verification_in_progress',
    },
    { value: IncidentStatus.Unverified, name: 'incident_status.unverified' },
    { value: IncidentStatus.Verified, name: 'incident_status.verified' },
    { value: IncidentStatus.Responded, name: 'incident_status.responded' },
    { value: IncidentStatus.Evaluated, name: 'incident_status.evaluated' },
  ];
  public control = new FormControl<IncidentStatus | null>(null);

  constructor(private postsService: PostsService) {}

  ngOnChanges(): void {
    this.control.setValue(this.post?.incident_status ?? null, { emitEvent: false });
  }

  onChange(value: IncidentStatus | null): void {
    this.postsService.updateIncidentStatus(this.post.id, value).subscribe((res) => {
      this.post = res.result;
      this.statusChanged.emit(this.post);
    });
  }
}
