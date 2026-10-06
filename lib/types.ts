export type OrganizationRole = "owner" | "employee";
export type AppLanguage = "de" | "en" | "fr" | "it";
export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Organization {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  workdayStart: string;
  workdayEnd: string;
  weekStartsOn: number;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  language: AppLanguage;
  createdAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  color: string;
  active: boolean;
  notes: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  organizationId: string;
  customerId: string;
  employeeId: string | null;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  status: JobStatus;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

export interface AppState {
  organizations: Organization[];
  organizationMembers: OrganizationMember[];
  customers: Customer[];
  employees: Employee[];
  jobs: Job[];
  users: RegisteredUser[];
  currentUserId: string | null;
  activeOrganizationId: string | null;
}

export interface SignUpInput {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface EmployeeFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  color: string;
  active: boolean;
  notes: string;
}

export interface CustomerFormInput {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  notes: string;
}

export interface JobFormInput {
  customerId: string;
  employeeId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  notes: string;
  status: JobStatus;
}
