export function formatToPST(dateString: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Los_Angeles',
    ...options
  };

  return date.toLocaleString('en-US', defaultOptions);
}

export function formatTimePST(dateString: string | null): string {
  return formatToPST(dateString, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTimePST(dateString: string | null): string {
  return formatToPST(dateString, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDatePST(dateString: string | null): string {
  return formatToPST(dateString, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatShortDatePST(dateString: string | null): string {
  return formatToPST(dateString, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
