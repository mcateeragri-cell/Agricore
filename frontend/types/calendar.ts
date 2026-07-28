export type CalendarTechnician = {
  id: string;
  fullName: string;
  email: string;
  role: string | null;
  calendarColour: string;
  isActive: boolean;
};

export type CalendarCustomer = {
  id: string;
  name: string;
};

export type CalendarMachine = {
  id: string;
  displayName: string;
};

export type CalendarJob = {
  id: string;
  jobNumber: string;
  jobSequence: number | null;
  customerId: string | null;
  machineId: string | null;
  status: string;
  priority: string;
  faultReported: string;
};

export type CalendarJobAssignment = {
  id: string;
  jobId: string;
  userId: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignmentStatus: string;
  notes: string;
};

export type StaffCalendarEvent = {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  notes: string;
};

export type CalendarResponse = {
  technicians: CalendarTechnician[];
  assignments: CalendarJobAssignment[];
  events: StaffCalendarEvent[];
  jobs: CalendarJob[];
  customers: CalendarCustomer[];
  machines: CalendarMachine[];
};

export type CreateCalendarAssignmentRequest = {
  jobId: string;
  userId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string;
};

export type CreateCalendarAssignmentResponse = {
  assignment: CalendarJobAssignment;
};

export type UpdateCalendarAssignmentRequest = {
  assignmentId: string;
  userId: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignmentStatus: string;
  notes?: string;
};

export type UpdateCalendarAssignmentResponse = {
  assignment: CalendarJobAssignment;
};

export type DeleteCalendarAssignmentRequest = {
  assignmentId: string;
};

export type DeleteCalendarAssignmentResponse = {
  success: true;
  assignmentId: string;
};

export type CalendarApiError = {
  error: string;
};