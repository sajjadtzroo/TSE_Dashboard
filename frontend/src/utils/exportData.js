/**
 * Export data as CSV with UTF-8 BOM for Persian text compatibility.
 */
export function exportToCsv(filename, columns, records) {
  const BOM = '\uFEFF';
  const headers = columns.map((c) => c.title || c.accessor);
  const rows = records.map((record) =>
    columns.map((col) => {
      const val = record[col.accessor];
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
