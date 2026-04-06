// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Проверить авторизацию
function checkAuth() {
  const token = localStorage.getItem('sosedik_token');
  const navGuest = document.getElementById('nav-guest');
  const navAuth = document.getElementById('nav-auth');
  const guestContent = document.getElementById('guest-content');
  const userContent = document.getElementById('user-content');
  const authContent = document.getElementById('auth-content');

  if (token) {
    // User is logged in
    if (navGuest) navGuest.classList.add('hidden');
    if (navAuth) navAuth.classList.remove('hidden');
    if (guestContent) guestContent.classList.add('hidden-content');
    if (userContent) userContent.classList.remove('hidden-content');
    if (authContent) authContent.classList.add('hidden-content');
    if (window.location.pathname.endsWith('/login.html')) {
      window.location.href = '/';
      return;
    }
  } else {
    // User is not logged in
    if (navGuest) navGuest.classList.remove('hidden');
    if (navAuth) navAuth.classList.add('hidden');
    if (guestContent) guestContent.classList.remove('hidden-content');
    if (userContent) userContent.classList.add('hidden-content');
    if (authContent) authContent.classList.add('hidden-content');
  }
}

// Show login form
function showLogin() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authContent = document.getElementById('auth-content');
  
  if (authContent) authContent.classList.remove('hidden-content');
  if (loginForm) loginForm.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
}

// Show register form
function showRegister() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm) loginForm.classList.add('hidden');
  if (registerForm) registerForm.classList.remove('hidden');
}

// Register
async function register() {
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;

  if (!phone || !password) {
    alert('Заполните все поля');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('sosedik_token', data.token);
      document.getElementById('register-phone').value = '';
      document.getElementById('register-password').value = '';
      checkAuth();
      window.location.href = '/';
      return;
    } else {
      alert(data.message || 'Ошибка регистрации');
    }
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// Login
async function login() {
  const phone = document.getElementById('login-phone').value;
  const password = document.getElementById('login-password').value;

  if (!phone || !password) {
    alert('Заполните все поля');
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('sosedik_token', data.token);
      document.getElementById('login-phone').value = '';
      document.getElementById('login-password').value = '';
      checkAuth();
      window.location.href = '/';
      return;
    } else {
      alert(data.message || 'Ошибка входа');
    }
  } catch (error) {
    alert('Ошибка: ' + error.message);
  }
}

// Logout
function logout() {
  localStorage.removeItem('sosedik_token');
  const loginPhone = document.getElementById('login-phone');
  const loginPassword = document.getElementById('login-password');
  if (loginPhone) loginPhone.value = '';
  if (loginPassword) loginPassword.value = '';
  checkAuth();
  window.location.href = '/';
}