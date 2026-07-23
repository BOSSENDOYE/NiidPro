import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Slider, Typography,
} from '@mui/material';
import { ZoomIn, ZoomOut, Check, Close } from '@mui/icons-material';

const DISPLAY    = 320;   // taille du canvas affiché (px)
const CIRCLE_R   = 138;   // rayon du cercle de cadrage
const CX         = DISPLAY / 2;
const CY         = DISPLAY / 2;
const OUTPUT_PX  = 300;   // taille de l'image exportée (px)

interface Props {
  open: boolean;
  imageSrc: string;            // data URL de l'image originale
  onConfirm: (file: File, previewUrl: string) => void;
  onCancel: () => void;
}

export default function PhotoCropperModal({ open, imageSrc, onConfirm, onCancel }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [img, setImg]         = useState<HTMLImageElement | null>(null);
  const [scale, setScale]     = useState(1);
  const [minScale, setMinScale] = useState(0.3);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const dragging = useRef(false);
  const lastPos  = useRef({ x: 0, y: 0 });

  // Charger l'image à chaque ouverture
  useEffect(() => {
    if (!open || !imageSrc) return;
    const image = new Image();
    image.onload = () => {
      // échelle initiale : le plus petit côté remplit le diamètre du cercle
      const minDim  = Math.min(image.width, image.height);
      const initSc  = (CIRCLE_R * 2) / minDim;
      setImg(image);
      setScale(initSc);
      setMinScale(initSc * 0.4);
      setOffset({ x: 0, y: 0 });
    };
    image.src = imageSrc;
  }, [open, imageSrc]);

  // Dessin du canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, DISPLAY, DISPLAY);

    // Image centrée avec décalage
    const w = img.width  * scale;
    const h = img.height * scale;
    ctx.drawImage(img, CX + offset.x - w / 2, CY + offset.y - h / 2, w, h);

    // Masque sombre avec trou circulaire (règle evenodd)
    ctx.beginPath();
    ctx.rect(0, 0, DISPLAY, DISPLAY);
    ctx.arc(CX, CY, CIRCLE_R, 0, Math.PI * 2, true); // sens inverse = trou
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fill('evenodd');

    // Bordure du cercle
    ctx.beginPath();
    ctx.arc(CX, CY, CIRCLE_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Guide pointillé intérieur
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(CX, CY, CIRCLE_R - 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }, [img, scale, offset]);

  useEffect(() => { draw(); }, [draw]);

  // ---- Souris ----
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    setGrabbing(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  };
  const stopDrag = () => { dragging.current = false; setGrabbing(false); };

  // ---- Tactile ----
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    lastPos.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - lastPos.current.x;
    const dy = t.clientY - lastPos.current.y;
    lastPos.current = { x: t.clientX, y: t.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  };

  // ---- Molette zoom ----
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    setScale(s => Math.min(minScale * 10, Math.max(minScale, s * factor)));
  };

  // ---- Export recadré ----
  const confirm = () => {
    if (!img) return;
    const out = document.createElement('canvas');
    out.width  = OUTPUT_PX;
    out.height = OUTPUT_PX;
    const ctx  = out.getContext('2d')!;

    // Rapport entre la taille output et le diamètre du cercle affiché
    const ratio = OUTPUT_PX / (CIRCLE_R * 2);
    const w = img.width  * scale * ratio;
    const h = img.height * scale * ratio;
    // Position de l'image dans le repère du cercle (origine = coin supérieur gauche du cercle)
    const x = (offset.x - img.width  * scale / 2 + CIRCLE_R) * ratio;
    const y = (offset.y - img.height * scale / 2 + CIRCLE_R) * ratio;

    ctx.drawImage(img, x, y, w, h);

    out.toBlob(blob => {
      if (!blob) return;
      const file       = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const previewUrl = out.toDataURL('image/jpeg', 0.92);
      onConfirm(file, previewUrl);
    }, 'image/jpeg', 0.92);
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth onClose={onCancel}
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 15, pb: 0.5 }}>
        Ajuster la photo de profil
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Typography sx={{ fontSize: 12, color: '#64748B', mb: 2 }}>
          Glissez l'image pour la repositionner · Molette ou curseur pour zoomer
        </Typography>

        {/* Canvas */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <canvas
            ref={canvasRef}
            width={DISPLAY}
            height={DISPLAY}
            style={{
              display: 'block',
              borderRadius: 14,
              background: '#0f172a',
              cursor: grabbing ? 'grabbing' : 'grab',
              touchAction: 'none',
              maxWidth: '100%',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={stopDrag}
          />
        </Box>

        {/* Slider zoom */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 0.5 }}>
          <ZoomOut sx={{ fontSize: 20, color: '#94A3B8', flexShrink: 0 }} />
          <Slider
            value={scale}
            min={minScale}
            max={minScale * 10}
            step={0.001}
            onChange={(_, v) => setScale(v as number)}
            sx={{ color: '#002f59' }}
          />
          <ZoomIn sx={{ fontSize: 20, color: '#94A3B8', flexShrink: 0 }} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onCancel}
          startIcon={<Close />}
          fullWidth
          sx={{
            textTransform: 'none', borderRadius: 2, fontWeight: 600,
            border: '1px solid #E2E8F0', color: '#64748B',
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={confirm}
          variant="contained"
          startIcon={<Check />}
          fullWidth
          sx={{
            textTransform: 'none', borderRadius: 2, fontWeight: 700,
            bgcolor: '#002f59', '&:hover': { bgcolor: '#003d73' },
          }}
        >
          Utiliser cette photo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
