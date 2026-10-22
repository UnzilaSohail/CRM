import type { Job } from 'bullmq';

export interface EchoData {
  message: string;
}

/** Sample processor; real jobs (kpi-snapshots, deviation-engine, ...) follow this shape. */
export async function echo(job: Pick<Job<EchoData>, 'data'>): Promise<{ echoed: string }> {
  return { echoed: job.data.message };
}
