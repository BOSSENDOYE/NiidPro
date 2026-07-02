import { useState } from 'react';
import { Autocomplete, Avatar, Box, TextField, Typography } from '@mui/material';
import type { Employee } from '../../types';

function matchAgent(emp: Employee, raw: string): boolean {
  const q = raw.toLowerCase();
  const qs = q.replace(/\s+/g, '');
  const tel1 = (emp.phone_professional ?? emp.phone ?? '').replace(/\s+/g, '').toLowerCase();
  const tel2 = (emp.phone_personal ?? '').replace(/\s+/g, '').toLowerCase();
  return (
    emp.employee_number.toLowerCase().includes(q) ||
    (qs.length > 0 && (tel1.includes(qs) || tel2.includes(qs))) ||
    emp.first_name.toLowerCase().startsWith(q)
  );
}

interface Props {
  employees: Employee[];
  value: Employee | null;
  onChange: (v: Employee | null) => void;
  label?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
}

export default function AgentAutocomplete({
  employees, value, onChange,
  label = 'Agent', required, size = 'small', disabled, error, helperText, fullWidth = true,
}: Props) {
  const [inputVal, setInputVal] = useState('');

  return (
    <Autocomplete
      options={employees}
      value={value}
      inputValue={inputVal}
      onInputChange={(_, v) => setInputVal(v)}
      onChange={(_, v) => onChange(v)}
      disabled={disabled}
      getOptionLabel={(e) => `${e.first_name} ${e.last_name}`}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.trim();
        if (q.length < 2) return [];
        return opts.filter(emp => matchAgent(emp, q));
      }}
      noOptionsText={
        inputVal.trim().length < 2
          ? 'Tapez 2 caractères (matricule, téléphone ou prénom)…'
          : 'Aucun agent trouvé'
      }
      renderOption={(props, emp) => {
        const { key, ...rest } = props as typeof props & { key: React.Key };
        return (
          <Box key={key} component="li" {...rest}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '8px !important' }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 800,
              background: 'linear-gradient(135deg,#2563EB,#7C3AED)', flexShrink: 0 }}>
              {emp.first_name?.[0]}{emp.last_name?.[0]}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                {emp.first_name} {emp.last_name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                {emp.employee_number}{emp.department?.name ? ` · ${emp.department.name}` : ''}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          size={size}
          error={error}
          helperText={helperText}
          placeholder="Matricule, téléphone ou 2 lettres du prénom…"
          fullWidth={fullWidth}
        />
      )}
    />
  );
}
