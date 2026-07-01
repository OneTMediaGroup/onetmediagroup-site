import { rememberPart } from './part-library.js';

export async function importPartsCsv(file) {
  const text = await file.text();
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return 0;

  const header = rows.shift().split(',').map((item) => item.trim().toLowerCase());
  const partIndex = header.findIndex((item) => item.includes('part'));
  const descIndex = header.findIndex((item) => item.includes('description') || item.includes('desc'));
  const unitIndex = header.findIndex((item) => item.includes('unit'));

  let count = 0;

  for (const row of rows) {
    const cols = row.split(',').map((item) => item.trim());
    const partNumber = cols[partIndex >= 0 ? partIndex : 0];

    if (!partNumber) continue;

    await rememberPart({
      partNumber,
      description: descIndex >= 0 ? cols[descIndex] : '',
      unit: unitIndex >= 0 ? cols[unitIndex] : 'Pcs'
    });

    count += 1;
  }

  return count;
}
