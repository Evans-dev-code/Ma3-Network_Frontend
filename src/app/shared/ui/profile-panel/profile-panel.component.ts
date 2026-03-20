import {
  Component, signal, computed, OnInit, inject, Input,
  Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule }     from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  UserProfileService, UserProfile, UserDocument, MySacco
} from '../../../core/services/user-profile.service';

type PanelTab = 'profile' | 'documents' | 'security' | 'sacco';

const DOC_TYPES: Record<string, { value: string; label: string }[]> = {
  OWNER: [
    { value: 'NTSA_CERTIFICATE',      label: 'NTSA Inspection Certificate'    },
    { value: 'INSURANCE_CERTIFICATE', label: 'Insurance Certificate'          },
    { value: 'LOGBOOK',               label: 'Vehicle Logbook'                },
    { value: 'TLB_LICENSE',           label: 'TLB License'                    },
    { value: 'GOOD_CONDUCT',          label: 'Certificate of Good Conduct'    },
    { value: 'OTHER',                 label: 'Other Document'                 }
  ],
  SACCO_MANAGER: [
    { value: 'SACCO_REGISTRATION',    label: 'SACCO Registration Certificate' },
    { value: 'SACCO_CERTIFICATE',     label: 'SACCO Operating Certificate'    },
    { value: 'GOOD_CONDUCT',          label: 'Certificate of Good Conduct'    },
    { value: 'OTHER',                 label: 'Other Document'                 }
  ],
  CREW: [
    { value: 'DRIVING_LICENCE',       label: 'Driving Licence'                },
    { value: 'NATIONAL_ID',           label: 'National ID'                    },
    { value: 'PSV_BADGE',             label: 'PSV Badge'                      },
    { value: 'GOOD_CONDUCT',          label: 'Certificate of Good Conduct'    },
    { value: 'OTHER',                 label: 'Other Document'                 }
  ],
  SUPER_ADMIN: [
    { value: 'NATIONAL_ID',           label: 'National ID'    },
    { value: 'OTHER',                 label: 'Other Document' }
  ]
};

@Component({
  selector:    'app-profile-panel',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './profile-panel.component.html',
  styleUrl:    './profile-panel.component.scss'
})
export class ProfilePanelComponent implements OnInit, OnChanges {

  private readonly profileService = inject(UserProfileService);
  private readonly snackBar       = inject(MatSnackBar);
  private readonly fb             = inject(FormBuilder);

  @Input()  isOpen  = false;
  @Input()  role    = '';
  @Output() closed          = new EventEmitter<void>();
  @Output() profileUpdated  = new EventEmitter<UserProfile>();

  // ── UI State ──────────────────────────────────────────────────────
  activeTab       = signal<PanelTab>('profile');
  isLoading       = signal(false);
  isSaving        = signal(false);
  isUploading     = signal(false);
  profile         = signal<UserProfile | null>(null);
  documents       = signal<UserDocument[]>([]);
  mySacco         = signal<MySacco | null>(null);
  editingProfile  = signal(false);
  editingSacco    = signal(false);
  selectedFile    = signal<File | null>(null);
  dragOver        = signal(false);
  deleteConfirmId = signal<number | null>(null);

  // ── Password visibility — declared first so toggle methods can reference them
  readonly hideOldPw  = signal(true);
  readonly hideNewPw  = signal(true);
  readonly hideConfPw = signal(true);

  // ── Forms ─────────────────────────────────────────────────────────
  profileForm: FormGroup = this.fb.group({
    firstName:   ['', Validators.required],
    lastName:    ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]]
  });

  passwordForm: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPw:   ['', Validators.required]
  });

  uploadForm: FormGroup = this.fb.group({
    documentType: ['', Validators.required],
    expiryDate:   ['']
  });

  saccoForm: FormGroup = this.fb.group({
    name:         ['', Validators.required],
    contactPhone: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]]
  });

  // ── Computed ──────────────────────────────────────────────────────
  initials = computed(() => {
    const p = this.profile();
    if (!p) return '?';
    return (p.firstName.charAt(0) + p.lastName.charAt(0)).toUpperCase();
  });

  fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}` : '';
  });

  roleLabel = computed(() => {
    const labels: Record<string, string> = {
      OWNER:         'Fleet Owner',
      SACCO_MANAGER: 'SACCO Manager',
      CREW:          'Crew Member',
      SUPER_ADMIN:   'Super Admin'
    };
    return labels[this.role] ?? this.role;
  });

  availableTabs = computed((): PanelTab[] => {
    const tabs: PanelTab[] = ['profile', 'documents', 'security'];
    if (this.role === 'SACCO_MANAGER') tabs.push('sacco');
    return tabs;
  });

  docTypes = computed(() => DOC_TYPES[this.role] ?? DOC_TYPES['SUPER_ADMIN']);

  expiredDocs  = computed(() =>
    this.documents().filter(d => d.expiryStatus === 'EXPIRED').length);
  expiringDocs = computed(() =>
    this.documents().filter(d => d.expiryStatus === 'EXPIRING').length);

  pwStrength = computed(() => {
    const pw = this.passwordForm.get('newPassword')?.value ?? '';
    if (pw.length >= 10) return { label: 'Strong', color: '#10b981', pct: 100 };
    if (pw.length >=  6) return { label: 'Good',   color: '#f59e0b', pct: 65  };
    if (pw.length >   0) return { label: 'Weak',   color: '#f43f5e', pct: 30  };
    return null;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true)  this.loadProfile();
    if (changes['isOpen']?.currentValue === false) this.resetState();
  }

  // ── Data loading ──────────────────────────────────────────────────
  private loadProfile(): void {
    this.isLoading.set(true);
    this.profileService.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.profileForm.patchValue({
          firstName:   p.firstName,
          lastName:    p.lastName,
          phoneNumber: p.phoneNumber
        });
        this.isLoading.set(false);
        this.loadDocuments();
        if (this.role === 'SACCO_MANAGER') this.loadSacco();
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadDocuments(): void {
    this.profileService.getDocuments().subscribe({
      next: (docs) => this.documents.set(docs),
      error: () => {}
    });
  }

  private loadSacco(): void {
    this.profileService.getMySacco().subscribe({
      next: (s) => {
        this.mySacco.set(s);
        this.saccoForm.patchValue({ name: s.name, contactPhone: s.contactPhone });
      },
      error: () => {}
    });
  }

  // ── Navigation ────────────────────────────────────────────────────
  setTab(tab: PanelTab): void {
    this.activeTab.set(tab);
    this.editingProfile.set(false);
    this.editingSacco.set(false);
  }

  close(): void { this.closed.emit(); }

  private resetState(): void {
    this.activeTab.set('profile');
    this.editingProfile.set(false);
    this.editingSacco.set(false);
    this.selectedFile.set(null);
    this.passwordForm.reset();
    this.uploadForm.reset();
    this.deleteConfirmId.set(null);
  }

  // ── Profile ───────────────────────────────────────────────────────
  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSaving.set(true);
    this.profileService.updateProfile(this.profileForm.value).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.editingProfile.set(false);
        const updated = { ...this.profile()!, ...res };
        this.profile.set(updated);
        this.profileUpdated.emit(updated);
        this.snackBar.open('✓ Profile updated', '', { duration: 3000 });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.snackBar.open(err.error?.error ?? 'Update failed', 'OK', { duration: 4000 });
      }
    });
  }

  // ── Password ──────────────────────────────────────────────────────
  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    const { oldPassword, newPassword, confirmPw } = this.passwordForm.value;
    if (newPassword !== confirmPw) {
      this.snackBar.open('New passwords do not match', 'OK', { duration: 3000 }); return;
    }
    this.isSaving.set(true);
    this.profileService.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.passwordForm.reset();
        this.snackBar.open('✓ Password changed. Please sign in again.', 'Close', { duration: 5000 });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.snackBar.open(err.error?.error ?? 'Password change failed', 'OK', { duration: 4000 });
      }
    });
  }

  // ── Password visibility toggles — named methods, no arrow fns in template
  toggleOldPw():  void { this.hideOldPw.update(v  => !v); }
  toggleNewPw():  void { this.hideNewPw.update(v  => !v); }
  toggleConfPw(): void { this.hideConfPw.update(v => !v); }

  // ── Documents ─────────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.selectedFile.set(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver.set(true);  }
  onDragLeave(): void                { this.dragOver.set(false); }

  uploadDocument(): void {
    const file = this.selectedFile();
    if (!file || this.uploadForm.invalid) { this.uploadForm.markAllAsTouched(); return; }
    this.isUploading.set(true);
    const { documentType, expiryDate } = this.uploadForm.value;
    this.profileService.uploadDocument(file, documentType, expiryDate || undefined).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.uploadForm.reset();
        this.snackBar.open('✓ Document uploaded', '', { duration: 3000 });
        this.loadDocuments();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.snackBar.open(err.error?.error ?? 'Upload failed', 'OK', { duration: 4000 });
      }
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId.set(id);   }
  cancelDelete():  void           { this.deleteConfirmId.set(null);  }

  deleteDocument(id: number): void {
    this.profileService.deleteDocument(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.snackBar.open('Document deleted', '', { duration: 2500 });
        this.documents.update(docs => docs.filter(d => d.id !== id));
      },
      error: () => this.snackBar.open('Delete failed', 'OK', { duration: 3000 })
    });
  }

  // ── SACCO ─────────────────────────────────────────────────────────
  saveSacco(): void {
    if (this.saccoForm.invalid) { this.saccoForm.markAllAsTouched(); return; }
    this.isSaving.set(true);
    this.profileService.updateMySacco(this.saccoForm.value).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.editingSacco.set(false);
        this.mySacco.update(s => s ? { ...s, ...res } : s);
        this.snackBar.open('✓ SACCO details updated', '', { duration: 3000 });
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('Update failed', 'OK', { duration: 3000 });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  getDocTypeLabel(value: string): string {
    for (const types of Object.values(DOC_TYPES)) {
      const found = types.find(t => t.value === value);
      if (found) return found.label;
    }
    return value;
  }

  getExpiryColor(status: string): string {
    if (status === 'EXPIRED')  return '#f43f5e';
    if (status === 'EXPIRING') return '#f59e0b';
    return '#10b981';
  }

  /**
   * Safe null-coalescing mime check.
   * Replaces d.mimeType?.includes() in the template to avoid NG8107 warnings.
   */
  getMimeClass(mimeType: string | null, type: 'pdf' | 'image'): boolean {
    return (mimeType ?? '').includes(type);
  }

  getMimeBg(mimeType: string | null): string {
    if ((mimeType ?? '').includes('pdf'))   return 'rgba(239,68,68,.1)';
    if ((mimeType ?? '').includes('image')) return 'rgba(59,130,246,.1)';
    return 'rgba(99,102,241,.1)';
  }

  getMimeColor(mimeType: string | null): string {
    if ((mimeType ?? '').includes('pdf'))   return '#ef4444';
    if ((mimeType ?? '').includes('image')) return '#3b82f6';
    return '#6366f1';
  }

  getMimeIcon(mimeType: string | null): string {
    return (mimeType ?? '').includes('image') ? 'image' : 'description';
  }
}