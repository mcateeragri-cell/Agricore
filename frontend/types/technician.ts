export type TechnicianDashboardCustomer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  postcode?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type TechnicianDashboardMachine = {
  id: string;
  displayName: string;
  registration: string;
  serialNumber: string;
};

export type TechnicianDashboardJob = {
  assignmentId: string;
  assignmentStatus: string;
  assignmentNotes: string;
  scheduledStart: string;
  scheduledEnd: string;
  jobId: string;
  jobNumber: string;
  status: string;
  priority: string;
  faultReported: string;
  engineerName: string;
  customer: TechnicianDashboardCustomer | null;
  machine: TechnicianDashboardMachine | null;
};

export type TechnicianDashboardResponse = {
  date: string;
  technician: {
    id: string;
    fullName: string;
    email: string;
  };
  jobs: TechnicianDashboardJob[];
};

export type TechnicianLabourEntry = {
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

export type TechnicianServiceChecklistItem = {
  id: string;
  description: string;
  completed: boolean;
};

export type TechnicianJobDetailResponse = {
  technician: {
    id: string;
    fullName: string;
    email: string;
  };
  assignment: {
    id: string;
    status: string;
    notes: string;
    scheduledStart: string;
    scheduledEnd: string;
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
    serviceProgrammeAssignmentId: string | null;
    serviceProgrammeName: string;
    serviceChecklist: TechnicianServiceChecklistItem[];
    isServiceJob: boolean;
  };
  customer: TechnicianDashboardCustomer | null;
  machine: TechnicianDashboardMachine | null;
  runningLabour: TechnicianLabourEntry | null;
  labourEntries: TechnicianLabourEntry[];
};

export type TechnicianJobAction =
  | "start_travel"
  | "arrive_on_site"
  | "start_labour"
  | "stop_labour"
  | "update_service_checklist"
  | "complete_job";

export type TechnicianJobActionRequest = {
  action: TechnicianJobAction;
  description?: string;
  diagnosis?: string;
  workCarriedOut?: string;
  serviceChecklist?: TechnicianServiceChecklistItem[];
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    capturedAt: string;
  } | null;
};

export type TechnicianJobActionResponse = {
  message: string;
};

export type TechnicianDashboardApiError = {
  error: string;
};