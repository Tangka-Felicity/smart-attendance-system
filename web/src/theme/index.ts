export const Colors = {
  primary: '#1A56DB',
  primaryDark: '#1043B8',
  primaryLight: '#6F7377',
  white: '#686868',
  background: '#07417B',
  
  card: '#C3BFBF',
  border: '#8F959D',
  borderLight: '#6A6C6F',
  textPrimary: '#0F172A',
  textSecondary: '#030304',
  textMuted: '#0A0A0B',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF9C3',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  atRisk: '#EA580C',
  atRiskBg: '#FFEDD5',
} as const;

export interface StatusColorResult {
  color: string;
  bg: string;
  label: string;
}

export function statusColor(pct: number): StatusColorResult {
  if (pct >= 80) {
    return {
      color: Colors.success,
      bg: Colors.successBg,
      label: 'Good',
    };
  }
  if (pct >= 60) {
    return {
      color: Colors.warning,
      bg: Colors.warningBg,
      label: 'Warning',
    };
  }
  if (pct >= 40) {
    return {
      color: Colors.atRisk,
      bg: Colors.atRiskBg,
      label: 'At Risk',
    };
  }
  return {
    color: Colors.danger,
    bg: Colors.dangerBg,
    label: 'Critical',
  };
}
