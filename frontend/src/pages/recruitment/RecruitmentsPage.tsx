import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Tabs, Tab, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, Card,
  CardContent, IconButton, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Select, FormControl,
  InputLabel, CircularProgress, Divider, Stack,
} from '@mui/material';
import {
  Add, Check, Close, Work, People, CalendarMonth,
  Edit, Publish, Lock, PersonAdd,
  Assignment, Schedule, CheckCircle,
} from '@mui/icons-material';
import { recruitmentApi } from '../../api/recruitment';
import type {
  RecruitmentRequest, JobPosting, JobApplication, Interview,
} from '../../types';

// �"?�"? helpers �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

const REQUEST_STATUS_LABELS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' }> = {
  draft:       { label: 'Brouillon',    color: 'default' },
  pending_rh:  { label: 'En attente',   color: 'warning' },
  approved:    { label: 'Approuvée',    color: 'success' },
  rejected:    { label: 'Rejetée',      color: 'error' },
  in_progress: { label: 'En cours',     color: 'primary' },
  closed:      { label: 'Clôturée',     color: 'default' },
};

const POSTING_STATUS_LABELS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' }> = {
  draft:     { label: 'Brouillon',  color: 'default' },
  published: { label: 'Publiée',    color: 'success' },
  closed:    { label: 'Clôturée',   color: 'warning' },
  archived:  { label: 'Archivée',   color: 'default' },
};

const APP_STATUS_LABELS: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' }> = {
  received:     { label: 'Reçue',          color: 'info' },
  pre_selected: { label: 'Présélectionnée', color: 'primary' },
  rejected_pre: { label: 'Éliminée',        color: 'error' },
  convoked:     { label: 'Convoquée',       color: 'warning' },
  interviewed:  { label: 'Entretenue',      color: 'primary' },
  rejected:     { label: 'Rejetée',         color: 'error' },
  selected:     { label: 'Sélectionnée',    color: 'success' },
  hired:        { label: 'Recrutée',        color: 'success' },
};

// �"?�"? StatCard �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ color, '& svg': { fontSize: 22 } }}>{icon}</Box>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: '#0F172A' }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// �"?�"? Main Component �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

export default function RecruitmentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  // �"? Dialog states �"?
  const [requestDialog, setRequestDialog]       = useState(false);
  const [postingDialog, setPostingDialog]       = useState(false);
  const [applicationDialog, setApplicationDialog] = useState(false);
  const [interviewDialog, setInterviewDialog]   = useState(false);
  const [rejectDialog, setRejectDialog]         = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [statusDialog, setStatusDialog]         = useState<{ open: boolean; application: JobApplication | null }>({ open: false, application: null });
  const [selectedPosting, setSelectedPosting]   = useState<JobPosting | null>(null);
  const [rejectReason, setRejectReason]         = useState('');

  // �"? Form states �"?
  const [reqForm, setReqForm] = useState({
    department_id: '', position_title: '', number_of_positions: 1,
    contract_type: 'CDI', desired_start_date: '', justification: '',
    hierarchical_level: '', budget: '',
  });
  const [postingForm, setPostingForm] = useState({
    department_id: '', title: '', location: '', description: '',
    missions: '', responsibilities: '', education_level: '',
    required_experience_years: '', publication_type: 'both', closing_date: '',
    recruitment_request_id: '',
  });
  const [appForm, setAppForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', is_internal: false,
  });
  const [ivForm, setIvForm] = useState({
    job_posting_id: '', application_id: '', scheduled_at: '',
    location: '', type: 'entretien', notes: '',
  });
  const [newStatus, setNewStatus] = useState('');

  // �"?�"? Queries �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

  const { data: stats } = useQuery({
    queryKey: ['recruitment', 'statistics'],
    queryFn: () => recruitmentApi.statistics().then((r) => r.data),
  });

  const { data: requestsData, isLoading: loadingRequests } = useQuery({
    queryKey: ['recruitment', 'requests'],
    queryFn: () => recruitmentApi.list().then((r) => r.data),
  });

  const { data: postingsData, isLoading: loadingPostings } = useQuery({
    queryKey: ['recruitment', 'postings'],
    queryFn: () => recruitmentApi.jobPostings().then((r) => r.data),
  });

  const { data: applicationsData, isLoading: loadingApplications } = useQuery({
    queryKey: ['recruitment', 'applications'],
    queryFn: () => recruitmentApi.allApplications().then((r) => r.data),
  });

  const { data: interviewsData, isLoading: loadingInterviews } = useQuery({
    queryKey: ['recruitment', 'interviews'],
    queryFn: () => recruitmentApi.interviews().then((r) => r.data),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/departments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }).then((r) => r.json()).then((d) => d.data ?? d),
  });

  // �"?�"? Mutations �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

  const createRequest = useMutation({
    mutationFn: (data: typeof reqForm & { submit?: boolean }) =>
      recruitmentApi.create({ ...data, department_id: Number(data.department_id) as unknown as number, number_of_positions: Number(data.number_of_positions), budget: data.budget ? Number(data.budget) : undefined, contract_type: data.contract_type as RecruitmentRequest['contract_type'] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setRequestDialog(false); resetReqForm(); },
  });

  const approveRequest = useMutation({
    mutationFn: (id: number) => recruitmentApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment'] }),
  });

  const rejectRequest = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => recruitmentApi.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setRejectDialog({ open: false, id: null }); setRejectReason(''); },
  });

  const createPosting = useMutation({
    mutationFn: (data: typeof postingForm) =>
      recruitmentApi.createJobPosting({
        ...data,
        publication_type: data.publication_type as 'internal' | 'external' | 'both',
        department_id: Number(data.department_id) as unknown as number,
        required_experience_years: data.required_experience_years ? Number(data.required_experience_years) : undefined,
        recruitment_request_id: data.recruitment_request_id ? Number(data.recruitment_request_id) : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setPostingDialog(false); resetPostingForm(); },
  });

  const publishPosting = useMutation({
    mutationFn: (id: number) => recruitmentApi.publishJobPosting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment'] }),
  });

  const closePosting = useMutation({
    mutationFn: (id: number) => recruitmentApi.closeJobPosting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment'] }),
  });

  const createApplication = useMutation({
    mutationFn: (data: typeof appForm) =>
      recruitmentApi.createApplication(selectedPosting!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setApplicationDialog(false); resetAppForm(); },
  });

  const updateAppStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      recruitmentApi.updateApplicationStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setStatusDialog({ open: false, application: null }); },
  });

  const createInterview = useMutation({
    mutationFn: (data: typeof ivForm) =>
      recruitmentApi.createInterview({
        ...data,
        type: data.type as 'entretien' | 'test_technique' | 'test_psychotechnique',
        job_posting_id: Number(data.job_posting_id) as unknown as number,
        application_id: Number(data.application_id) as unknown as number,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recruitment'] }); setInterviewDialog(false); resetIvForm(); },
  });

  const completeInterview = useMutation({
    mutationFn: (id: number) => recruitmentApi.updateInterview(id, { status: 'completed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment'] }),
  });

  // �"?�"? Helpers �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

  const resetReqForm = () => setReqForm({ department_id: '', position_title: '', number_of_positions: 1, contract_type: 'CDI', desired_start_date: '', justification: '', hierarchical_level: '', budget: '' });
  const resetPostingForm = () => setPostingForm({ department_id: '', title: '', location: '', description: '', missions: '', responsibilities: '', education_level: '', required_experience_years: '', publication_type: 'both', closing_date: '', recruitment_request_id: '' });
  const resetAppForm = () => setAppForm({ first_name: '', last_name: '', email: '', phone: '', is_internal: false });
  const resetIvForm = () => setIvForm({ job_posting_id: '', application_id: '', scheduled_at: '', location: '', type: 'entretien', notes: '' });

  const requests = requestsData?.data ?? [];
  const postings = postingsData?.data ?? [];
  const applications = applicationsData?.data ?? [];
  const interviews = interviewsData?.data ?? [];

  // �"?�"? Render �"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?�"?

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Gestion des Recrutements
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5 }}>
            De l'expression du besoin à l'intégration
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {tab === 1 && (
            <Button variant="contained" startIcon={<Add />}
              onClick={() => setRequestDialog(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
              Nouvelle demande
            </Button>
          )}
          {tab === 2 && (
            <Button variant="contained" startIcon={<Add />}
              onClick={() => setPostingDialog(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#7C3AED' }}>
              Nouvelle offre
            </Button>
          )}
          {tab === 3 && selectedPosting && (
            <Button variant="contained" startIcon={<PersonAdd />}
              onClick={() => setApplicationDialog(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#059669' }}>
              Ajouter candidature
            </Button>
          )}
          {tab === 4 && (
            <Button variant="contained" startIcon={<Schedule />}
              onClick={() => setInterviewDialog(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, bgcolor: '#D97706' }}>
              Planifier entretien
            </Button>
          )}
        </Stack>
      </Box>

      {/* �"?�"? KPI Cards �"?�"? */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Demandes totales" value={stats?.requests.total ?? 0} icon={<Assignment />} color="#2563EB" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Offres publiées" value={stats?.postings.published ?? 0} icon={<Work />} color="#7C3AED" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Candidatures" value={stats?.applications.total ?? 0} icon={<People />} color="#059669" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Entretiens prévus" value={stats?.interviews.scheduled ?? 0} icon={<CalendarMonth />} color="#D97706" />
        </Grid>
      </Grid>

      {/* �"?�"? Tabs �"?�"? */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid #E2E8F0', px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13, minHeight: 52 },
          }}
        >
          <Tab label="Tableau de bord" />
          <Tab label="Demandes" />
          <Tab label="Offres d'emploi" />
          <Tab label="Candidatures" />
          <Tab label="Entretiens" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>

          {/* �.��.� TAB 0 : DASHBOARD �.��.� */}
          {tab === 0 && stats && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#374151' }}>Demandes par statut</Typography>
                <Stack spacing={1}>
                  {Object.entries(REQUEST_STATUS_LABELS).map(([s, { label, color }]) => (
                    <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                      <Chip label={label} color={color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                      <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {stats.requests[s as keyof typeof stats.requests] ?? 0}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#374151' }}>Candidatures par statut</Typography>
                <Stack spacing={1}>
                  {[
                    { key: 'total', label: 'Total', color: '#2563EB' },
                    { key: 'received', label: 'Reçues', color: '#64748B' },
                    { key: 'pre_selected', label: 'Présélectionnées', color: '#7C3AED' },
                    { key: 'hired', label: 'Recrutées', color: '#059669' },
                  ].map(({ key, label, color }) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                      <Typography sx={{ fontSize: 13, color: '#374151' }}>{label}</Typography>
                      <Typography sx={{ fontWeight: 700, color }}>{stats.applications[key as keyof typeof stats.applications] ?? 0}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* �.��.� TAB 1 : DEMANDES �.��.� */}
          {tab === 1 && (
            loadingRequests ? <CircularProgress /> :
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#64748B', borderBottom: '2px solid #E2E8F0' } }}>
                    <TableCell>Poste</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Type contrat</TableCell>
                    <TableCell>Nb. postes</TableCell>
                    <TableCell>Demandeur</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
                        Aucune demande de recrutement
                      </TableCell>
                    </TableRow>
                  )}
                  {requests.map((req: RecruitmentRequest) => {
                    const s = REQUEST_STATUS_LABELS[req.status] ?? { label: req.status, color: 'default' as const };
                    return (
                      <TableRow key={req.id} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{req.position_title}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{req.department?.name ?? 'É"'}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{req.contract_type}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{req.number_of_positions}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{req.requester?.name ?? 'É"'}</TableCell>
                        <TableCell>
                          <Chip label={s.label} color={s.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {req.status === 'pending_rh' && (
                              <>
                                <Tooltip title="Approuver">
                                  <IconButton size="small" color="success"
                                    onClick={() => approveRequest.mutate(req.id)}>
                                    <Check fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Rejeter">
                                  <IconButton size="small" color="error"
                                    onClick={() => { setRejectDialog({ open: true, id: req.id }); }}>
                                    <Close fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* �.��.� TAB 2 : OFFRES �.��.� */}
          {tab === 2 && (
            loadingPostings ? <CircularProgress /> :
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#64748B', borderBottom: '2px solid #E2E8F0' } }}>
                    <TableCell>Intitulé du poste</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Type publication</TableCell>
                    <TableCell>Candidatures</TableCell>
                    <TableCell>Clôture</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {postings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
                        Aucune offre d'emploi créée
                      </TableCell>
                    </TableRow>
                  )}
                  {postings.map((p: JobPosting) => {
                    const s = POSTING_STATUS_LABELS[p.status] ?? { label: p.status, color: 'default' as const };
                    const pubMap: Record<string, string> = { internal: 'Interne', external: 'Externe', both: 'Interne + Externe' };
                    return (
                      <TableRow key={p.id} hover selected={selectedPosting?.id === p.id}
                        onClick={() => setSelectedPosting(p)}
                        sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{p.title}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.department?.name ?? 'É"'}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{pubMap[p.publication_type]}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.applications_count ?? 0}</TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{p.closing_date ? new Date(p.closing_date).toLocaleDateString('fr-FR') : 'É"'}</TableCell>
                        <TableCell>
                          <Chip label={s.label} color={s.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {p.status === 'draft' && (
                              <Tooltip title="Publier">
                                <IconButton size="small" color="success"
                                  onClick={() => publishPosting.mutate(p.id)}>
                                  <Publish fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {p.status === 'published' && (
                              <>
                                <Tooltip title="Ajouter candidature">
                                  <IconButton size="small" color="primary"
                                    onClick={() => { setSelectedPosting(p); setApplicationDialog(true); }}>
                                    <PersonAdd fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Clôturer">
                                  <IconButton size="small" color="warning"
                                    onClick={() => closePosting.mutate(p.id)}>
                                    <Lock fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* �.��.� TAB 3 : CANDIDATURES �.��.� */}
          {tab === 3 && (
            loadingApplications ? <CircularProgress /> :
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#64748B', borderBottom: '2px solid #E2E8F0' } }}>
                    <TableCell>N° Candidature</TableCell>
                    <TableCell>Candidat</TableCell>
                    <TableCell>Offre</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
                        Aucune candidature reçue
                      </TableCell>
                    </TableRow>
                  )}
                  {applications.map((app: JobApplication) => {
                    const s = APP_STATUS_LABELS[app.status] ?? { label: app.status, color: 'default' as const };
                    return (
                      <TableRow key={app.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, color: '#7C3AED' }}>
                          {app.application_number}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                          {app.last_name} {app.first_name}
                          {app.is_internal && <Chip label="Interne" size="small" sx={{ ml: 1, fontSize: 10, height: 16 }} />}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{app.job_posting?.title ?? 'É"'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{app.job_posting?.department?.name ?? 'É"'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {new Date(app.application_date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, color: app.overall_score ? '#059669' : '#94A3B8' }}>
                          {app.overall_score != null ? `${app.overall_score}/5` : 'É"'}
                        </TableCell>
                        <TableCell>
                          <Chip label={s.label} color={s.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Changer le statut">
                            <IconButton size="small" color="primary"
                              onClick={() => { setStatusDialog({ open: true, application: app }); setNewStatus(app.status); }}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* �.��.� TAB 4 : ENTRETIENS �.��.� */}
          {tab === 4 && (
            loadingInterviews ? <CircularProgress /> :
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: '#64748B', borderBottom: '2px solid #E2E8F0' } }}>
                    <TableCell>Candidat</TableCell>
                    <TableCell>Offre</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date & Heure</TableCell>
                    <TableCell>Lieu</TableCell>
                    <TableCell>Résultat</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interviews.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: 13 }}>
                        Aucun entretien planifié
                      </TableCell>
                    </TableRow>
                  )}
                  {interviews.map((iv: Interview) => {
                    const typeMap: Record<string, string> = { entretien: 'Entretien', test_technique: 'Test technique', test_psychotechnique: 'Test psycho.' };
                    const resultMap: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
                      pending: { label: 'En attente', color: 'default' },
                      admitted: { label: 'Admis', color: 'success' },
                      rejected: { label: 'Rejeté', color: 'error' },
                    };
                    const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
                      scheduled: { label: 'Planifié', color: 'warning' },
                      completed: { label: 'Terminé', color: 'success' },
                      cancelled: { label: 'Annulé', color: 'error' },
                    };
                    const r = resultMap[iv.result] ?? { label: iv.result, color: 'default' as const };
                    const st = statusMap[iv.status] ?? { label: iv.status, color: 'default' as const };
                    return (
                      <TableRow key={iv.id} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                          {iv.application ? `${iv.application.last_name} ${iv.application.first_name}` : 'É"'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{iv.job_posting?.title ?? 'É"'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{typeMap[iv.type] ?? iv.type}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {new Date(iv.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{iv.location ?? 'É"'}</TableCell>
                        <TableCell>
                          <Chip label={r.label} color={r.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right">
                          {iv.status === 'scheduled' && (
                            <Tooltip title="Marquer terminé">
                              <IconButton size="small" color="success"
                                onClick={() => completeInterview.mutate(iv.id)}>
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Card>

      {/* �.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.�
          DIALOGS
      �.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.��.� */}

      {/* �"?�"? Dialog : Nouvelle demande �"?�"? */}
      <Dialog open={requestDialog} onClose={() => setRequestDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Nouvelle demande de recrutement</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction / Service *</InputLabel>
                <Select label="Direction / Service *"
                  value={reqForm.department_id}
                  onChange={(e) => setReqForm((f) => ({ ...f, department_id: String(e.target.value) }))}>
                  {(departments ?? []).map((d: { id: number; name: string }) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={8}>
              <TextField fullWidth size="small" label="Intitulé du poste *"
                value={reqForm.position_title}
                onChange={(e) => setReqForm((f) => ({ ...f, position_title: e.target.value }))} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="Nb. postes *" type="number"
                value={reqForm.number_of_positions}
                onChange={(e) => setReqForm((f) => ({ ...f, number_of_positions: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type de contrat *</InputLabel>
                <Select label="Type de contrat *"
                  value={reqForm.contract_type}
                  onChange={(e) => setReqForm((f) => ({ ...f, contract_type: e.target.value }))}>
                  {['CDI', 'CDD', 'Stage', 'Consultant', 'Freelance', 'Autre'].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date souhaitée de prise de fonction"
                type="date" InputLabelProps={{ shrink: true }}
                value={reqForm.desired_start_date}
                onChange={(e) => setReqForm((f) => ({ ...f, desired_start_date: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Niveau hiérarchique"
                value={reqForm.hierarchical_level}
                onChange={(e) => setReqForm((f) => ({ ...f, hierarchical_level: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Budget (FCFA)" type="number"
                value={reqForm.budget}
                onChange={(e) => setReqForm((f) => ({ ...f, budget: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Justification du recrutement *"
                multiline rows={3}
                value={reqForm.justification}
                onChange={(e) => setReqForm((f) => ({ ...f, justification: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setRequestDialog(false)} sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="outlined" color="secondary"
            onClick={() => createRequest.mutate({ ...reqForm })}
            disabled={createRequest.isPending}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Enregistrer brouillon
          </Button>
          <Button variant="contained"
            onClick={() => createRequest.mutate({ ...reqForm, submit: true })}
            disabled={createRequest.isPending || !reqForm.department_id || !reqForm.position_title || !reqForm.justification}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            Soumettre au RH
          </Button>
        </DialogActions>
      </Dialog>

      {/* �"?�"? Dialog : Rejeter demande �"?�"? */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: null })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Motif de rejet</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Motif *" multiline rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setRejectDialog({ open: false, id: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained" color="error"
            disabled={!rejectReason || rejectRequest.isPending}
            onClick={() => rejectRequest.mutate({ id: rejectDialog.id!, reason: rejectReason })}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            Confirmer le rejet
          </Button>
        </DialogActions>
      </Dialog>

      {/* �"?�"? Dialog : Nouvelle offre �"?�"? */}
      <Dialog open={postingDialog} onClose={() => setPostingDialog(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Nouvelle fiche de poste</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Intitulé du poste *"
                value={postingForm.title}
                onChange={(e) => setPostingForm((f) => ({ ...f, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Direction *</InputLabel>
                <Select label="Direction *"
                  value={postingForm.department_id}
                  onChange={(e) => setPostingForm((f) => ({ ...f, department_id: String(e.target.value) }))}>
                  {(departments ?? []).map((d: { id: number; name: string }) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Localisation"
                value={postingForm.location}
                onChange={(e) => setPostingForm((f) => ({ ...f, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Niveau d'études requis"
                value={postingForm.education_level}
                onChange={(e) => setPostingForm((f) => ({ ...f, education_level: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Expérience (années)" type="number"
                value={postingForm.required_experience_years}
                onChange={(e) => setPostingForm((f) => ({ ...f, required_experience_years: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Type de publication</InputLabel>
                <Select label="Type de publication"
                  value={postingForm.publication_type}
                  onChange={(e) => setPostingForm((f) => ({ ...f, publication_type: e.target.value }))}>
                  <MenuItem value="internal">Interne</MenuItem>
                  <MenuItem value="external">Externe</MenuItem>
                  <MenuItem value="both">Interne + Externe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Date de clôture"
                type="date" InputLabelProps={{ shrink: true }}
                value={postingForm.closing_date}
                onChange={(e) => setPostingForm((f) => ({ ...f, closing_date: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Description du poste"
                multiline rows={2}
                value={postingForm.description}
                onChange={(e) => setPostingForm((f) => ({ ...f, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Missions principales"
                multiline rows={3}
                value={postingForm.missions}
                onChange={(e) => setPostingForm((f) => ({ ...f, missions: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Responsabilités"
                multiline rows={3}
                value={postingForm.responsibilities}
                onChange={(e) => setPostingForm((f) => ({ ...f, responsibilities: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setPostingDialog(false)} sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained"
            onClick={() => createPosting.mutate(postingForm)}
            disabled={createPosting.isPending || !postingForm.title || !postingForm.department_id}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#7C3AED' }}>
            Créer la fiche de poste
          </Button>
        </DialogActions>
      </Dialog>

      {/* �"?�"? Dialog : Ajouter candidature �"?�"? */}
      <Dialog open={applicationDialog} onClose={() => setApplicationDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Nouvelle candidature{selectedPosting ? ` É" ${selectedPosting.title}` : ''}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Prénom *"
                value={appForm.first_name}
                onChange={(e) => setAppForm((f) => ({ ...f, first_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Nom *"
                value={appForm.last_name}
                onChange={(e) => setAppForm((f) => ({ ...f, last_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Email *" type="email"
                value={appForm.email}
                onChange={(e) => setAppForm((f) => ({ ...f, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Téléphone"
                value={appForm.phone}
                onChange={(e) => setAppForm((f) => ({ ...f, phone: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setApplicationDialog(false)} sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained"
            onClick={() => createApplication.mutate(appForm)}
            disabled={createApplication.isPending || !appForm.first_name || !appForm.last_name || !appForm.email || !selectedPosting}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#059669' }}>
            Enregistrer candidature
          </Button>
        </DialogActions>
      </Dialog>

      {/* �"?�"? Dialog : Planifier entretien �"?�"? */}
      <Dialog open={interviewDialog} onClose={() => setInterviewDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Planifier un entretien</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Offre d'emploi *</InputLabel>
                <Select label="Offre d'emploi *"
                  value={ivForm.job_posting_id}
                  onChange={(e) => setIvForm((f) => ({ ...f, job_posting_id: String(e.target.value) }))}>
                  {postings.filter((p: JobPosting) => p.status !== 'draft').map((p: JobPosting) => (
                    <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Candidature *</InputLabel>
                <Select label="Candidature *"
                  value={ivForm.application_id}
                  onChange={(e) => setIvForm((f) => ({ ...f, application_id: String(e.target.value) }))}>
                  {applications
                    .filter((a: JobApplication) =>
                      !ivForm.job_posting_id || String(a.job_posting_id) === ivForm.job_posting_id
                    )
                    .map((a: JobApplication) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.last_name} {a.first_name} ({a.application_number})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="Date et heure *"
                type="datetime-local" InputLabelProps={{ shrink: true }}
                value={ivForm.scheduled_at}
                onChange={(e) => setIvForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type d'entretien *</InputLabel>
                <Select label="Type d'entretien *"
                  value={ivForm.type}
                  onChange={(e) => setIvForm((f) => ({ ...f, type: e.target.value }))}>
                  <MenuItem value="entretien">Entretien</MenuItem>
                  <MenuItem value="test_technique">Test technique</MenuItem>
                  <MenuItem value="test_psychotechnique">Test psychotechnique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Lieu"
                value={ivForm.location}
                onChange={(e) => setIvForm((f) => ({ ...f, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Notes" multiline rows={2}
                value={ivForm.notes}
                onChange={(e) => setIvForm((f) => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setInterviewDialog(false)} sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained"
            onClick={() => createInterview.mutate(ivForm)}
            disabled={createInterview.isPending || !ivForm.job_posting_id || !ivForm.application_id || !ivForm.scheduled_at}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700, bgcolor: '#D97706' }}>
            Planifier
          </Button>
        </DialogActions>
      </Dialog>

      {/* �"?�"? Dialog : Statut candidature �"?�"? */}
      <Dialog open={statusDialog.open} onClose={() => setStatusDialog({ open: false, application: null })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Modifier le statut de la candidature
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: 13, color: '#64748B', mb: 2 }}>
            Candidat : <strong>{statusDialog.application?.last_name} {statusDialog.application?.first_name}</strong>
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Nouveau statut</InputLabel>
            <Select label="Nouveau statut" value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}>
              {Object.entries(APP_STATUS_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setStatusDialog({ open: false, application: null })}
            sx={{ borderRadius: '9px', textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained"
            disabled={updateAppStatus.isPending || !newStatus}
            onClick={() => updateAppStatus.mutate({ id: statusDialog.application!.id, status: newStatus })}
            sx={{ borderRadius: '9px', textTransform: 'none', fontWeight: 700 }}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
