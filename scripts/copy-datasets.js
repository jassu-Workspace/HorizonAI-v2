import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'Datasets');
const dest = path.join(root, 'courses');

async function run() {
    try {
        await fs.promises.mkdir(dest, { recursive: true });
        const files = ['udemy_courses.csv'];
        for (const f of files) {
            const src = path.join(root, f);
            const dst = path.join(dest, f);
            try {
                await fs.promises.copyFile(src, dst);
                console.log('copied', src, '->', dst);
            } catch (err) {
                console.warn('failed to copy', src, err?.message || err);
            }
        }
    } catch (err) {
        console.error('copy-datasets failed', err);
        process.exitCode = 1;
    }
}

run();
