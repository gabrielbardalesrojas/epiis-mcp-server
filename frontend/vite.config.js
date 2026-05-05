import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// HTTPS solo si existen los certificados (Windows con ngrok), sino HTTP normal (Ubuntu)
const certPath = path.resolve(__dirname, '../certs/server.key');
const certsExist = fs.existsSync(certPath);

const httpsConfig = certsExist
    ? {
        key: fs.readFileSync(path.resolve(__dirname, '../certs/server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../certs/server.crt')),
    }
    : false;

const apiTarget = certsExist ? 'https://localhost:3001' : 'http://localhost:3001';

export default defineConfig({
    plugins: [react()],
    envDir: '..',
    server: {
        port: 3000,
        host: '0.0.0.0',
        https: httpsConfig,
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: false,
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
