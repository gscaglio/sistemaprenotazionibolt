import bcrypt from 'bcryptjs';

const password = 'Roominbloom2024!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Hash della password:', hash);