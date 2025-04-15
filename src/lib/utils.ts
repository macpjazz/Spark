import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type User } from './storage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | undefined | null) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      // Try parsing Firebase timestamp format
      const match = date.match(/([A-Za-z]+)\s+(\d+),\s+(\d+)/);
      if (match) {
        const [_, month, day, year] = match;
        const d = new Date(`${month} ${day}, ${year}`);
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      }
      return '-';
    }
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

export async function validateUrl(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Try to fetch the URL with a HEAD request
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors' // This is important for cross-origin requests
    });

    return true; // If we get here, the URL is valid and accessible
  } catch (error) {
    console.error('Error validating URL:', error);
    return false;
  }
}

export function exportToCSV(data: any[], filename: string) {
  // Convert data to CSV format
  const csvContent = convertToCSV(data);
  
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const rows = [
    // Headers row
    headers.join(','),
    // Data rows
    ...data.map(obj => 
      headers.map(header => {
        const value = obj[header];
        // Handle special cases (arrays, objects, null, undefined)
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return `"${value.join(';')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value;
      }).join(',')
    )
  ];
  
  return rows.join('\n');
}

export function formatUserForCSV(user: User) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    department: user.department,
    role: user.role,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  };
}
