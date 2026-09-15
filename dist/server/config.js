import path from 'path';
import fs from 'fs';
export function getDataDir() {
    if (process.env.DATA_DIR) {
        return path.resolve(process.env.DATA_DIR);
    }
    // Render persistent disk par défaut
    if (fs.existsSync('/var/data')) {
        return '/var/data';
    }
    // Railway volume par défaut
    if (fs.existsSync('/data')) {
        return '/data';
    }
    return path.resolve(process.cwd(), 'data');
}
export const DATA_DIR = getDataDir();
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
catch (err) {
    console.warn('[Config] Erreur création dossier données:', err);
}
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}
catch (err) {
    console.warn('[Config] Erreur création dossier uploads:', err);
}
