import { useQuery } from '@tanstack/react-query';
import { settingsApi, type CompanySettings } from '../api/settings';

/**
 * Récupère les paramètres de l'entreprise (nom, logo, coordonnées…).
 * Partagé via le cache React-Query (clé « settings ») : toute modification
 * dans la Configuration se répercute automatiquement partout.
 */
export function useCompany() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const company: Partial<CompanySettings> = data ?? {};
  return {
    company,
    name: company.name || 'RH+PAIE',
    legalName: company.legal_name || '',
    logoUrl:  company.logo_url  || null,
    stampUrl: company.stamp_url || null,
  };
}
