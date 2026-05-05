import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database.js';
import { Logger } from '../../utils/logger.js';

const router = express.Router();
const logger = new Logger('ChatAuthRoutes');

const getJwtSecret = () => process.env.JWT_SECRET || 'epiis-admin-jwt-secret';

// ── Middleware de autenticación para usuarios del chat ─────────────────
export const chatAuthMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded.isChatUser) {
            return res.status(403).json({ error: 'Acceso restringido a usuarios del chat' });
        }
        req.chatUser = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// ── POST /api/chat-auth/login ─────────────────────────────────────────
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const db = getDatabase();
        const user = db.prepare('SELECT * FROM chat_users WHERE username = ?').get(username);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
        }

        const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
        if (hashedInput !== user.password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar último login
        db.prepare('UPDATE chat_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                isChatUser: true,
            },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        logger.info(`Chat user login: ${username}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
            },
        });
    } catch (error) {
        logger.error('Error en login de chat:', error);
        res.status(500).json({ error: 'Error interno de autenticación' });
    }
});

// ── GET /api/chat-auth/me ─────────────────────────────────────────────
router.get('/me', chatAuthMiddleware, (req, res) => {
    res.json({
        user: {
            id: req.chatUser.id,
            username: req.chatUser.username,
            full_name: req.chatUser.full_name,
            email: req.chatUser.email,
        },
    });
});

// ── POST /api/chat-auth/logout ────────────────────────────────────────
router.post('/logout', chatAuthMiddleware, (req, res) => {
    logger.info(`Chat user ${req.chatUser.username} cerró sesión`);
    res.json({ success: true });
});

// ── PUT /api/chat-auth/password ───────────────────────────────────────
router.put('/password', chatAuthMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
        }
        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
        }

        const db = getDatabase();
        const user = db.prepare('SELECT password FROM chat_users WHERE id = ?').get(req.chatUser.id);

        const hashedCurrent = crypto.createHash('sha256').update(currentPassword).digest('hex');
        if (hashedCurrent !== user.password) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedNew = crypto.createHash('sha256').update(newPassword).digest('hex');
        db.prepare('UPDATE chat_users SET password = ? WHERE id = ?').run(hashedNew, req.chatUser.id);

        logger.info(`Chat user ${req.chatUser.username} cambió su contraseña`);
        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        logger.error('Error al cambiar contraseña de chat user:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;
