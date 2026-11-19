export type ExportFormat = 'excel' | 'csv';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value: string | number): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob: Blob, filename: string) {
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
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ];
    // UTF-8 BOM agar karakter dan kolom terbaca rapi di Microsoft Excel
    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    triggerDownload(blob, `${filenameBase}_${dateStamp}.csv`);
    return;
  }

  // Format Excel (.xls) menggunakan HTML table terstruktur dengan encoding UTF-8
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
  triggerDownload(blob, `${filenameBase}_${dateStamp}.xls`);
}
