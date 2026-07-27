import client from './client';

export interface WorkflowLevel {
  id?:            number;
  workflow_key:   string;
  workflow_label: string;
  level:          number;
  label:          string;
  role_name:      string;
  is_active:      boolean;
}

export interface WorkflowGroup {
  key:    string;
  label:  string;
  levels: WorkflowLevel[];
}

export const workflowConfigApi = {
  list: () =>
    client.get<WorkflowGroup[]>('/workflow-configs').then(r => r.data),

  save: (rows: WorkflowLevel[]) =>
    client.put<{ message: string }>('/workflow-configs', rows).then(r => r.data),

  remove: (key: string) =>
    client.delete(`/workflow-configs/${key}`),
};
