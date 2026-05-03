const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
require('dotenv').config();

// Register
router.post('/register', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password required' });
    }

    // Check if user exists
    const existingUser = await User.getUserByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.createUser(phone, passwordHash);

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, level: newUser.level },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'User registered', user: newUser, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password required' });
    }

    // Find user
    const user = await User.getUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, level: user.level },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful', token, user: { id: user.id, phone: user.phone, level: user.level } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Временное хранилище кодов (в памяти)
const verificationCodes = {};

// 1) Отправить код (демо)
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Телефон обязателен' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[phone] = code;

  console.log(`[SMS DEMO] Код для ${phone}: ${code}`);

  // Возвращаем код в ответе (для демонстрации)
  res.json({ message: 'Код отправлен (демо)', code });
});

// 2) Подтвердить код и завершить регистрацию
router.post('/verify-code', async (req, res) => {
  const { phone, password, code } = req.body;
  if (!phone || !password || !code) {
    return res.status(400).json({ message: 'Телефон, пароль и код обязательны' });
  }

  const storedCode = verificationCodes[phone];
  if (!storedCode) {
    return res.status(400).json({ message: 'Сначала запросите код подтверждения' });
  }
  if (storedCode !== code) {
    return res.status(400).json({ message: 'Неверный код. Попробуйте снова или запросите новый код.' });
  }

  try {
    const existingUser = await User.getUserByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким номером уже зарегистрирован' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await User.createUser(phone, passwordHash); // уровень 1

    delete verificationCodes[phone]; // одноразовый код

    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, level: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Регистрация успешна', token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;