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

/**
 * Export data as JSON file
 */
export function exportToJson(filename, columns, records) {
  const exportData = records.map((record) => {
    const obj = {};
    columns.forEach((col) => {
      if (col.accessor !== '_star' && !col.accessor.startsWith('_')) {
        obj[col.title || col.accessor] = record[col.accessor];
      }
    });
    return obj;
  });

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export data as XLSX (Excel) file with RTL support for Persian text.
 */
export function exportToXlsx(filename, columns, records) {
  import('xlsx').then((XLSX) => {
    const headers = columns
      .filter((c) => c.accessor !== '_star' && !c.accessor.startsWith('_'))
      .map((c) => c.title || c.accessor);

    const rows = records.map((record) =>
      columns
        .filter((c) => c.accessor !== '_star' && !c.accessor.startsWith('_'))
        .map((col) => {
          const val = record[col.accessor];
          return val == null ? '' : val;
        })
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  });
}

/**
 * Copy table data to clipboard in tab-separated format (for pasting into Excel/Sheets)
 */
export async function copyToClipboard(columns, records) {
  try {
    const headers = columns
      .filter((c) => c.accessor !== '_star' && !c.accessor.startsWith('_'))
      .map((c) => c.title || c.accessor);

    const rows = records.map((record) =>
      columns
        .filter((c) => c.accessor !== '_star' && !c.accessor.startsWith('_'))
        .map((col) => {
          const val = record[col.accessor];
          return val == null ? '' : String(val);
        })
    );

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
