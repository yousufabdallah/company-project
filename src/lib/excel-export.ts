// Excel/CSV export helper.
// Generates a UTF-8 CSV with BOM (opens cleanly in Excel, supports Arabic).
// Triggers a browser download with the given filename.

export interface ExcelColumn {
  header: string;
  key: string;
  // Optional formatter to transform the raw value before writing
  format?: (value: any, row: any) => string | number;
}

/**
 * Convert an array of rows into a CSV string.
 * - Escapes values containing commas, quotes, or newlines
 * - Prepends UTF-8 BOM so Excel renders Arabic correctly
 */
function toCSV(rows: any[], columns: ExcelColumn[]): string {
  const escape = (val: any): string => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    // Escape double quotes by doubling them
    str = str.replace(/"/g, '""');
    // Wrap in quotes if it contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      str = `"${str}"`;
    }
    return str;
  };

  const headerRow = columns.map((c) => escape(c.header)).join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.format ? c.format(row[c.key], row) : row[c.key];
        return escape(raw);
      })
      .join(",")
  );

  return [headerRow, ...dataRows].join("\r\n");
}

/**
 * Export rows to an Excel-compatible CSV file and trigger download.
 * @param rows Array of data objects
 * @param columns Column definitions (header + key + optional formatter)
 * @param filename Output filename (without extension)
 */
export function exportToExcel(rows: any[], columns: ExcelColumn[], filename: string): void {
  const csv = toCSV(rows, columns);
  // Prepend UTF-8 BOM (\uFEFF) so Excel reads Arabic correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export multiple sheets to a single Excel-compatible file.
 * Since CSV doesn't support multiple sheets, this creates a single
 * combined CSV with each "sheet" separated by a section header.
 */
export function exportMultipleSheets(
  sheets: Array<{ name: string; rows: any[]; columns: ExcelColumn[] }>,
  filename: string
): void {
  const sections = sheets.map((sheet) => {
    const header = `=== ${sheet.name} ===`;
    const csv = toCSV(sheet.rows, sheet.columns);
    return [header, csv].join("\r\n");
  });
  const combined = sections.join("\r\n\r\n");
  const blob = new Blob(["\uFEFF" + combined], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
