/** Illustrative sample data only. Replaced by API calls once the backend exists. */
import { computeDeviation, actualProgress, plannedProgress, type Milestone } from '@crm/kpi-engine';

export const TODAY = '2026-10-22';

export interface Customer {
  id: string;
  name: string;
  industry: string;
  contact: string;
  phone: string;
  status: 'Active' | 'Prospect' | 'Archived';
  projects: number;
}
export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Meezan Bank',
    industry: 'Banking',
    contact: 'Imran Shafiq',
    phone: '+92 21 111 000 000',
    status: 'Active',
    projects: 3,
  },
  {
    id: 'c2',
    name: 'Gulf Logistics',
    industry: 'Logistics',
    contact: 'Khalid Rezaie',
    phone: '+971 4 555 0100',
    status: 'Active',
    projects: 2,
  },
  {
    id: 'c3',
    name: 'Amber Retail',
    industry: 'Retail',
    contact: 'Sana Qureshi',
    phone: '+92 42 111 222 333',
    status: 'Active',
    projects: 1,
  },
  {
    id: 'c4',
    name: 'PTCL Enterprise',
    industry: 'Telecom',
    contact: 'Sara Khan',
    phone: '+92 51 111 002 002',
    status: 'Prospect',
    projects: 0,
  },
  {
    id: 'c5',
    name: 'Sapphire Textiles',
    industry: 'Manufacturing',
    contact: 'Ali Raza',
    phone: '+92 42 111 333 444',
    status: 'Active',
    projects: 2,
  },
  {
    id: 'c6',
    name: 'Askari Insurance',
    industry: 'Insurance',
    contact: 'Usman Latif',
    phone: '+92 21 111 444 555',
    status: 'Archived',
    projects: 1,
  },
];

export interface Project {
  id: string;
  name: string;
  customerId: string;
  manager: string;
  due: string;
  status: 'On Track' | 'At Risk' | 'Delayed';
  milestones: Milestone[];
  budgetVisible?: boolean;
}
const m = (
  weight: number,
  percentComplete: number,
  plannedStart: string,
  plannedEnd: string,
): Milestone => ({ weight, percentComplete, plannedStart, plannedEnd });

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Core API migration',
    customerId: 'c1',
    manager: 'S. Khalid',
    due: '2026-11-24',
    status: 'At Risk',
    milestones: [
      m(20, 100, '2026-09-01', '2026-09-20'),
      m(25, 70, '2026-09-15', '2026-10-25'),
      m(30, 20, '2026-10-10', '2026-11-10'),
      m(25, 0, '2026-11-01', '2026-11-24'),
    ],
  },
  {
    id: 'p2',
    name: 'Customer portal revamp',
    customerId: 'c2',
    manager: 'A. Noor',
    due: '2026-12-05',
    status: 'On Track',
    milestones: [
      m(30, 100, '2026-09-10', '2026-10-05'),
      m(40, 55, '2026-10-01', '2026-11-05'),
      m(30, 0, '2026-11-01', '2026-12-05'),
    ],
  },
  {
    id: 'p3',
    name: 'ETL data pipeline',
    customerId: 'c3',
    manager: 'H. Tariq',
    due: '2026-11-10',
    status: 'Delayed',
    milestones: [m(40, 80, '2026-09-01', '2026-10-01'), m(60, 10, '2026-10-01', '2026-11-10')],
  },
  {
    id: 'p4',
    name: 'Loan origination UI',
    customerId: 'c1',
    manager: 'S. Khalid',
    due: '2027-01-15',
    status: 'On Track',
    milestones: [m(50, 40, '2026-10-01', '2026-11-30'), m(50, 0, '2026-12-01', '2027-01-15')],
  },
  {
    id: 'p5',
    name: 'Fleet tracking',
    customerId: 'c2',
    manager: 'A. Noor',
    due: '2026-12-20',
    status: 'On Track',
    milestones: [m(100, 50, '2026-09-20', '2026-12-20')],
  },
];

export function projectKpi(p: Project, asOf = TODAY) {
  const planned = plannedProgress(p.milestones, asOf);
  const actual = actualProgress(p.milestones);
  return computeDeviation(planned, actual);
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Under Review' | 'Completed';
export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: TaskStatus;
  progress: number;
  due: string;
}
export const tasks: Task[] = [
  {
    id: 't1',
    title: 'Migrate account balance service',
    project: 'Core API migration',
    assignee: 'Imran Shafiq',
    priority: 'High',
    status: 'In Progress',
    progress: 40,
    due: '2026-10-25',
  },
  {
    id: 't2',
    title: 'Contract tests for /v3/auth',
    project: 'Core API migration',
    assignee: 'Hamza Tariq',
    priority: 'Medium',
    status: 'In Progress',
    progress: 60,
    due: '2026-10-27',
  },
  {
    id: 't3',
    title: 'Security review',
    project: 'Core API migration',
    assignee: 'Ayesha Noor',
    priority: 'High',
    status: 'To Do',
    progress: 0,
    due: '2026-10-30',
  },
  {
    id: 't4',
    title: 'Update API documentation',
    project: 'Customer portal revamp',
    assignee: 'Bilal Malik',
    priority: 'Low',
    status: 'To Do',
    progress: 0,
    due: '2026-11-02',
  },
  {
    id: 't5',
    title: 'Token refresh endpoint',
    project: 'Core API migration',
    assignee: 'Faisal Raza',
    priority: 'Medium',
    status: 'Under Review',
    progress: 90,
    due: '2026-10-23',
  },
  {
    id: 't6',
    title: 'Settlement endpoints',
    project: 'ETL data pipeline',
    assignee: 'Zara Ahmed',
    priority: 'High',
    status: 'Under Review',
    progress: 85,
    due: '2026-10-20',
  },
  {
    id: 't7',
    title: 'Discovery and scoping',
    project: 'Loan origination UI',
    assignee: 'Miriam Shah',
    priority: 'Medium',
    status: 'Completed',
    progress: 100,
    due: '2026-10-10',
  },
  {
    id: 't8',
    title: 'Environment setup',
    project: 'Fleet tracking',
    assignee: 'Hamza Tariq',
    priority: 'Low',
    status: 'Completed',
    progress: 100,
    due: '2026-10-05',
  },
  {
    id: 't9',
    title: 'Map legacy settlement fields',
    project: 'ETL data pipeline',
    assignee: 'Zara Ahmed',
    priority: 'High',
    status: 'In Progress',
    progress: 30,
    due: '2026-10-21',
  },
];

export const activity = [
  {
    who: 'Hamza Tariq',
    what: 'updated progress to 42%',
    where: 'Core API migration',
    when: '2 min ago',
  },
  { who: 'Zara Ahmed', what: 'completed 3 tasks', where: 'ETL data pipeline', when: '18 min ago' },
  {
    who: 'Bilal Malik',
    what: 'submitted test results',
    where: 'Customer portal revamp',
    when: '32 min ago',
  },
  { who: 'Miriam Shah', what: 'raised a risk', where: 'Loan origination UI', when: '1 hour ago' },
  { who: 'Faisal Raza', what: 'uploaded a document', where: 'Fleet tracking', when: '2 hours ago' },
];

export const team = [
  { name: 'Hamza Tariq', score: 42 },
  { name: 'Ayesha Noor', score: 48 },
  { name: 'Bilal Malik', score: 77 },
  { name: 'Zara Ahmed', score: 90 },
  { name: 'Faisal Raza', score: 79 },
];

export const chat = [
  {
    who: 'Zara Ahmed',
    time: '10:24 AM',
    text: 'The ETL queue job is complete. Sharing results.',
    file: 'etl-results.pdf',
  },
  { who: 'Hamza Tariq', time: '10:31 AM', text: "Great. I'll update the progress to 42%." },
  {
    who: 'Faisal Raza',
    time: '10:40 AM',
    text: 'Client reviewed the documentation. Waiting on approval.',
  },
];

export const attendanceLog = [
  { day: 'Thu 22 Oct', in: '09:02', out: '—', hours: '4h 18m', mode: 'Office', flag: '' },
  { day: 'Wed 21 Oct', in: '09:10', out: '17:45', hours: '8h 35m', mode: 'Office', flag: '' },
  { day: 'Tue 20 Oct', in: '10:25', out: '18:00', hours: '7h 35m', mode: 'Remote', flag: 'Late' },
  { day: 'Mon 19 Oct', in: '—', out: '—', hours: '0h', mode: '—', flag: 'Leave' },
];

export const milestoneStatusOf = (pct: number) =>
  pct >= 100 ? 'Done' : pct > 0 ? 'In progress' : 'Not started';
export const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Unknown';
