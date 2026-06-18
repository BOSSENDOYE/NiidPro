import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, Stack, Avatar, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Description, PictureAsPdf, Visibility } from '@mui/icons-material';
import { meApi } from '../../api/me';
import { documentsApi } from '../../api/documents';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PortalDocuments() {
  const { data: docs, isLoading } = useQuery({ queryKey: ['me', 'documents'], queryFn: () => meApi.documents().then((r) => r.data) });

  const openDoc = async (id: number) => {
    try {
      const r = await documentsApi.getGenerated(id);
      const doc = (r as { data?: { content_final?: string } }).data ?? (r as { content_final?: string });
      const html = (doc as { content_final?: string })?.content_final ?? '';
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } catch { /* ignore */ }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 0.5 }}>Mes documents</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2.5 }}>Attestations et documents qui vous concernent.</Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={22} /></Box>
      ) : (docs?.length ?? 0) === 0 ? (
        <Card sx={{ borderRadius: '16px', p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Description sx={{ fontSize: 40, color: 'divider', mb: 1 }} />
          <Typography sx={{ fontSize: 13 }}>Aucun document disponible</Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {docs!.map((d) => (
            <Card key={d.id} sx={{ borderRadius: '14px', p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar variant="rounded" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', borderRadius: '12px' }}>
                  <PictureAsPdf />
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap>{d.title}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    Réf. {d.reference} · {fmtDate(d.created_at)}
                  </Typography>
                </Box>
                <Tooltip title="Ouvrir">
                  <IconButton onClick={() => openDoc(d.id)} sx={{ color: '#2563EB' }}><Visibility /></IconButton>
                </Tooltip>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
