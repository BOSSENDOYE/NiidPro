import axios from 'axios';
import type {
  RecruitmentRequest, JobPosting, JobPostingCriterion,
  JobApplication, Interview, InterviewEvaluation,
  RecruitmentStatistics, PaginatedResponse,
  RecruitmentIndice, RecruitmentHierarchy,
  RecruitmentAugmentation, RecruitmentBareme,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Demandes de recrutement ─────────────────────────────────────────────────

export const recruitmentApi = {
  // Stats
  statistics: () =>
    api.get<RecruitmentStatistics>('/recruitment/statistics'),

  // Demandes
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<RecruitmentRequest>>('/recruitment', { params }),

  pending: () =>
    api.get<PaginatedResponse<RecruitmentRequest>>('/recruitment/pending'),

  create: (data: Partial<RecruitmentRequest> & { submit?: boolean }) =>
    api.post<RecruitmentRequest>('/recruitment', data),

  get: (id: number) =>
    api.get<RecruitmentRequest>(`/recruitment/${id}`),

  update: (id: number, data: Partial<RecruitmentRequest> & { submit?: boolean }) =>
    api.put<RecruitmentRequest>(`/recruitment/${id}`, data),

  delete: (id: number) =>
    api.delete(`/recruitment/${id}`),

  approve: (id: number) =>
    api.post<RecruitmentRequest>(`/recruitment/${id}/approve`),

  reject: (id: number, reason: string) =>
    api.post<RecruitmentRequest>(`/recruitment/${id}/reject`, { reason }),

  // ── Offres d'emploi ────────────────────────────────────────────────────────

  jobPostings: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<JobPosting>>('/job-postings', { params }),

  createJobPosting: (data: Partial<JobPosting>) =>
    api.post<JobPosting>('/job-postings', data),

  getJobPosting: (id: number) =>
    api.get<JobPosting>(`/job-postings/${id}`),

  updateJobPosting: (id: number, data: Partial<JobPosting>) =>
    api.put<JobPosting>(`/job-postings/${id}`, data),

  deleteJobPosting: (id: number) =>
    api.delete(`/job-postings/${id}`),

  publishJobPosting: (id: number) =>
    api.post<JobPosting>(`/job-postings/${id}/publish`),

  closeJobPosting: (id: number) =>
    api.post<JobPosting>(`/job-postings/${id}/close`),

  // ── Critères ───────────────────────────────────────────────────────────────

  getCriteria: (postingId: number) =>
    api.get<JobPostingCriterion[]>(`/job-postings/${postingId}/criteria`),

  createCriterion: (postingId: number, data: Partial<JobPostingCriterion>) =>
    api.post<JobPostingCriterion>(`/job-postings/${postingId}/criteria`, data),

  updateCriterion: (postingId: number, criterionId: number, data: Partial<JobPostingCriterion>) =>
    api.put<JobPostingCriterion>(`/job-postings/${postingId}/criteria/${criterionId}`, data),

  deleteCriterion: (postingId: number, criterionId: number) =>
    api.delete(`/job-postings/${postingId}/criteria/${criterionId}`),

  // ── Candidatures ───────────────────────────────────────────────────────────

  allApplications: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<JobApplication>>('/applications', { params }),

  getApplications: (postingId: number, params?: Record<string, unknown>) =>
    api.get<JobApplication[]>(`/job-postings/${postingId}/applications`, { params }),

  createApplication: (postingId: number, data: Partial<JobApplication>) =>
    api.post<JobApplication>(`/job-postings/${postingId}/applications`, data),

  getApplication: (id: number) =>
    api.get<JobApplication>(`/applications/${id}`),

  updateApplicationStatus: (id: number, status: string, notes?: string) =>
    api.patch<JobApplication>(`/applications/${id}/status`, { status, notes }),

  uploadDocument: (applicationId: number, formData: FormData) =>
    api.post(`/applications/${applicationId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── Entretiens ─────────────────────────────────────────────────────────────

  interviews: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Interview>>('/interviews', { params }),

  createInterview: (data: Partial<Interview>) =>
    api.post<Interview>('/interviews', data),

  updateInterview: (id: number, data: Partial<Interview>) =>
    api.put<Interview>(`/interviews/${id}`, data),

  deleteInterview: (id: number) =>
    api.delete(`/interviews/${id}`),

  evaluate: (interviewId: number, evaluations: Partial<InterviewEvaluation>[]) =>
    api.post<Interview>(`/interviews/${interviewId}/evaluate`, { evaluations }),

  // ── Paramètres ─────────────────────────────────────────────────────────────

  // Indices
  getIndices: () =>
    api.get<RecruitmentIndice[]>('/recruitment-params/indices'),
  createIndice: (data: Partial<RecruitmentIndice>) =>
    api.post<RecruitmentIndice>('/recruitment-params/indices', data),
  updateIndice: (id: number, data: Partial<RecruitmentIndice>) =>
    api.put<RecruitmentIndice>(`/recruitment-params/indices/${id}`, data),
  deleteIndice: (id: number) =>
    api.delete(`/recruitment-params/indices/${id}`),

  // Hiérarchies
  getHierarchies: () =>
    api.get<RecruitmentHierarchy[]>('/recruitment-params/hierarchies'),
  createHierarchy: (data: Partial<RecruitmentHierarchy>) =>
    api.post<RecruitmentHierarchy>('/recruitment-params/hierarchies', data),
  updateHierarchy: (id: number, data: Partial<RecruitmentHierarchy>) =>
    api.put<RecruitmentHierarchy>(`/recruitment-params/hierarchies/${id}`, data),
  deleteHierarchy: (id: number) =>
    api.delete(`/recruitment-params/hierarchies/${id}`),

  // Augmentations
  getAugmentations: () =>
    api.get<RecruitmentAugmentation[]>('/recruitment-params/augmentations'),
  createAugmentation: (data: Partial<RecruitmentAugmentation>) =>
    api.post<RecruitmentAugmentation>('/recruitment-params/augmentations', data),
  updateAugmentation: (id: number, data: Partial<RecruitmentAugmentation>) =>
    api.put<RecruitmentAugmentation>(`/recruitment-params/augmentations/${id}`, data),
  deleteAugmentation: (id: number) =>
    api.delete(`/recruitment-params/augmentations/${id}`),

  // Barèmes
  getBaremes: (hierarchyId?: number) =>
    api.get<RecruitmentBareme[]>('/recruitment-params/baremes', {
      params: hierarchyId ? { hierarchy_id: hierarchyId } : undefined,
    }),
  createBareme: (data: Partial<RecruitmentBareme>) =>
    api.post<RecruitmentBareme>('/recruitment-params/baremes', data),
  updateBareme: (id: number, data: Partial<RecruitmentBareme>) =>
    api.put<RecruitmentBareme>(`/recruitment-params/baremes/${id}`, data),
  deleteBareme: (id: number) =>
    api.delete(`/recruitment-params/baremes/${id}`),
};
