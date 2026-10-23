/** Shapes returned by the API (kept in sync by hand until an OpenAPI client is generated). */
export type Severity = 'none' | 'watch' | 'critical';

export interface Me {
  id: string;
  tenantId: string;
  role: 'CEO' | 'SUPER_ADMIN' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE' | 'CUSTOMER';
}

export interface ProjectSummary {
  id: string;
  name: string;
  customer: string;
  status: string;
  due: string;
  baselineVersion: number;
  timeZone: string;
  today: string;
  planned: number;
  actual: number;
  negativeDeviation: number;
  severity: Severity;
}

export interface ProjectDetail extends ProjectSummary {
  milestones: {
    id: string;
    name: string;
    weight: number;
    percentComplete: number;
    plannedStart: string;
    plannedEnd: string;
    clientVisible: boolean;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  industry: string | null;
  country: string | null;
  status: 'PROSPECT' | 'ACTIVE' | 'ARCHIVED';
}

export interface CustomerPage {
  items: Customer[];
  nextCursor: string | null;
}

export interface DeviationRow {
  projectId: string;
  project: string;
  customer: string;
  planned: number;
  actual: number;
  negativeDeviation: number;
  severity: 'watch' | 'critical';
  acknowledged: boolean;
  cause: string | null;
}

export interface PortalProject {
  id: string;
  name: string;
  due: string;
  progress: number;
  milestones: { name: string; status: string }[];
}
