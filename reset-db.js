import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'backend', 'database', 'epiis.db');
const db = new Database(DB_PATH);

console.log('🔄 Reseteando credenciales de administrador...');

const username = 'admin';
const password = 'admin123';
const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

try {
  // Eliminar si existe para asegurar frescura
  db.prepare('DELETE FROM admin_users WHERE username = ?').run(username);
  
  // Insertar
  db.prepare(
    'INSERT INTO admin_users (username, password, name, email) VALUES (?, ?, ?, ?)'
  ).run(username, hashedPassword, 'Administrador EPIIS', 'admin@epiis.unas.edu.pe');

  // También resetear el usuario de chat por si acaso
  db.prepare('DELETE FROM chat_users WHERE username = ?').run('usuario');
  const hashedUserPass = crypto.createHash('sha256').update('usuario123').digest('hex');
  db.prepare(
    'INSERT INTO chat_users (username, password, full_name, email, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run('usuario', hashedUserPass, 'Usuario EPIIS', 'usuario@epiis.unas.edu.pe', 'system');

  console.log('✅ Credenciales reseteadas con éxito:');
  console.log('👤 Admin: admin / admin123');
  console.log('👤 Chat: usuario / usuario123');
} catch (error) {
  console.error('❌ Error al resetear:', error.message);
} finally {
  db.close();
}
