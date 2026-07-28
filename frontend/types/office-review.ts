export type OfficeReviewStatus =
  | "submitted"
  | "approved"
  | "rejected";

export type OfficeReviewCustomer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
};

export type OfficeReviewMachine = {
  id: string;
  displayName: string;
  registration: string;
  serialNumber: string;
  machineHours: number | null;
};

export type OfficeReviewCompletion = {
  id: string;
  jobId: string;
  assignmentId: string | null;

  submittedBy: string;
  technicianName: string;

  diagnosis: string;
  workCarriedOut: string;

  customerName: string;
  customerPosition: string;
  customerConfirmation: boolean;

  signatureDataUrl: string | null;
  signatureStoragePath: string | null;

  machineTested: boolean;
  guardsFitted: boolean;
  areaLeftTidy: boolean;
  customerInstructed: boolean;

  photosChecked: boolean;
  partsChecked: boolean;
  labourChecked: boolean;

  technicianNotes: string;
  officeNotes: string;
  rejectionReason: string;

  status: OfficeReviewStatus;

  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type OfficeReviewQueueItem = {
  completionId: string;
  jobId: string;
  jobNumber: string;

  jobStatus: string;
  priority: string;
  faultReported: string;
  invoiceStatus: string;

  technicianName: string;
  submittedAt: string | null;

  customer: OfficeReviewCustomer | null;
  machine: OfficeReviewMachine | null;
};

export type OfficeReviewQueueResponse = {
  reviewer: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };

  counts: {
    submitted: number;
    approved: number;
    rejected: number;
  };

  completions: OfficeReviewQueueItem[];
};

export type OfficeReviewLabourEntry = {
  id: string;
  engineerName: string;
  labourDate: string;
  startTime: string;
  finishTime: string;
  hours: number | null;
  hourlyRate: number;
  description: string;
  entryStatus: string;
};

export type OfficeReviewPart = {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  notes: string;
  lineCost: number;
  lineTotal: number;
};

export type OfficeReviewPhoto = {
  id: string;
  filePath: string;
  caption: string;
  createdAt: string;
  url: string;
};

export type OfficeReviewDetailResponse = {
  reviewer: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };

  job: {
    id: string;
    jobNumber: string;
    status: string;
    priority: string;
    faultReported: string;
    diagnosis: string;
    workCarriedOut: string;
    internalNotes: string;
    machineHours: number | null;
    invoiceStatus: string;
  };

  customer: OfficeReviewCustomer | null;
  machine: OfficeReviewMachine | null;

  completion: OfficeReviewCompletion;

  labourEntries: OfficeReviewLabourEntry[];
  parts: OfficeReviewPart[];
  photos: OfficeReviewPhoto[];

  totals: {
    labourHours: number;
    labourValue: number;
    partsCost: number;
    partsValue: number;
  };
};

export type OfficeReviewDecision =
  | "approve"
  | "reject";

export type OfficeReviewDecisionRequest = {
  action: OfficeReviewDecision;
  officeNotes?: string;
  rejectionReason?: string;
};

export type OfficeReviewDecisionResponse = {
  success: boolean;
  message: string;
  completion: OfficeReviewCompletion;
};

export type OfficeReviewApiError = {
  error: string;
};