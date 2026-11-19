import { sanitizeCsvFormula } from './security';

export type ExportFormat = 'excel' | 'csv';

function escapeCsvCell(value: string | number): string {
  const safeStr = sanitizeCsvFormula(value);
  if (
    safeStr.includes(',') ||
    safeStr.includes('"') ||
    safeStr.includes('\n') ||
    safeStr.includes(';')
  ) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }
  return safeStr;
}

function escapeHtml(value: string | number): string {
  return sanitizeCsvFormula(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCsvString(
  headers: string[],
  rows: Array<Array<string | number>>
): string {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return '\uFEFF' + csvLines.join('\r\n');
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTabularData({
  title,
  filenameBase,
  headers,
  rows,
  format,
}: {
  title: string;
  filenameBase: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  format: ExportFormat;
}) {
  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csvContent = buildCsvString(headers, rows);
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    triggerBlobDownload(blob, `${filenameBase}_${dateStamp}.csv`);
    return;
  }

  const headerHtml = headers
    .map(
      (h) =>
        `<th style="background-color:#1e293b;color:#ffffff;font-weight:bold;padding:8px 10px;border:1px solid #cbd5e1;text-align:left;">${escapeHtml(
          h
        )}</th>`
    )
    .join('');

  const bodyHtml = rows
    .map(
      (row, rowIndex) =>
        `<tr style="background-color:${rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'};">${row
          .map(
            (cell) =>
              `<td style="padding:7px 10px;border:1px solid #cbd5e1;vertical-align:top;">${escapeHtml(
                cell
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  const workbookHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h3 style="font-family:sans-serif;margin-bottom:8px;">${escapeHtml(title)}</h3>
  <table style="border-collapse:collapse;font-family:sans-serif;font-size:12px;">
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + workbookHtml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  triggerBlobDownload(blob, `${filenameBase}_${dateStamp}.xls`);
}
