import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATASETS_DIR = path.join(__dirname, '..', 'Datasets', 'courses');

const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    result.push(cur);
    return result.map(s => s.trim());
};

export type CourseRow = Record<string, string> & { _source?: string };

const listCsvFiles = async (): Promise<string[]> => {
    try {
        const entries = await fs.promises.readdir(DATASETS_DIR);
        return entries.filter(f => f.toLowerCase().endsWith('.csv')).map(f => path.join(DATASETS_DIR, f));
    } catch (err) {
        return [];
    }
};

export const searchCourses = async (query: string, limit = 20): Promise<CourseRow[]> => {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];

    const files = await listCsvFiles();
    const results: CourseRow[] = [];

    for (const file of files) {
        const stream = fs.createReadStream(file, { encoding: 'utf8' });
        const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

        let headers: string[] | null = null;

        for await (const line of rl) {
            if (!headers) {
                headers = parseCsvLine(line).map(h => h.replace(/^\uFEFF/, ''));
                continue;
            }

            const values = parseCsvLine(line);
            const row: Record<string, string> = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i] || `col_${i}`] = values[i] ?? '';
            }

            const title = (row['course_title'] || row['title'] || '').toLowerCase();
            const org = (row['course_organization'] || row['organization'] || '') .toLowerCase();

            if (title.includes(q) || org.includes(q) || Object.values(row).some(v => String(v).toLowerCase().includes(q))) {
                row._source = file;
                results.push(row as CourseRow);
                if (results.length >= limit) {
                    rl.close();
                    stream.close();
                    break;
                }
            }
        }

        // Stop early if we've satisfied limit
        if (results.length >= limit) break;
    }

    return results;
};
