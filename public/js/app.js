// Basic client-side JavaScript for Sosedik app
console.log('Sosedik app loaded');

let currentToken = null;

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  const token = localStorage.getItem('sosedik_token');
  if (token) {
    currentToken = token;
    showAuthStatus('Вы вошли в систему', true);
    showAdsSection();
  }
});

// Show authentication status
function showAuthStatus(message, isLoggedIn = false) {
  const statusDiv = document.getElementById('auth-status');
  const statusText = document.getElementById('status-text');
  const logoutBtn = document.getElementById('logout-btn');

  statusText.textContent = message;
  statusDiv.classList.remove('hidden', 'error', 'success');

  if (isLoggedIn) {
    statusDiv.classList.add('success');
    logoutBtn.classList.remove('hidden');
    showNav();
  } else {
    statusDiv.classList.add('error');
    logoutBtn.classList.add('hidden');
    hideNav();
  }
}

// Show navigation
function showNav() {
  document.getElementById('nav').classList.remove('hidden');
}

// Hide navigation
function hideNav() {
  document.getElementById('nav').classList.add('hidden');
}

// Show ads section
function showAdsSection() {
  document.getElementById('ads-section').classList.remove('hidden');
}

// Hide ads section
function hideAdsSection() {
  document.getElementById('ads-section').classList.add('hidden');
}

// Register function
async function register() {
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;

  if (!phone || !password) {
    showAuthStatus('Заполните все поля');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();

    if (response.ok) {
      currentToken = data.token;
      localStorage.setItem('sosedik_token', currentToken);
      showAuthStatus('Регистрация успешна! Вы вошли в систему.', true);
      showAdsSection();
      // Redirect to profile
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1000);
      // Clear form
      document.getElementById('register-phone').value = '';
      document.getElementById('register-password').value = '';
    } else {
      showAuthStatus(data.message || 'Ошибка регистрации');
    }
  } catch (error) {
    showAuthStatus('Ошибка сети: ' + error.message);
  }
}

// Login function
async function login() {
  const phone = document.getElementById('login-phone').value;
  const password = document.getElementById('login-password').value;

  if (!phone || !password) {
    showAuthStatus('Заполните все поля');
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();

    if (response.ok) {
      currentToken = data.token;
      localStorage.setItem('sosedik_token', currentToken);
      showAuthStatus('Вход выполнен успешно!', true);
      showAdsSection();
      // Redirect to profile
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1000);
      // Clear form
      document.getElementById('login-phone').value = '';
      document.getElementById('login-password').value = '';
    } else {
      showAuthStatus(data.message || 'Ошибка входа');
    }
  } catch (error) {
    showAuthStatus('Ошибка сети: ' + error.message);
  }
}

// Logout function
function logout() {
  currentToken = null;
  localStorage.removeItem('sosedik_token');
  showAuthStatus('Вы вышли из системы');
  hideAdsSection();
  hideNav();
  // Redirect to main page
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// Load ads function
async function loadAds() {
  try {
    const response = await fetch('/api/ads');
    const ads = await response.json();

    const adsList = document.getElementById('ads-list');
    adsList.innerHTML = '';

    if (ads.length === 0) {
      adsList.innerHTML = '<p>Нет объявлений</p>';
      return;
    }

    ads.forEach(ad => {
      const adDiv = document.createElement('div');
      adDiv.className = 'form-container';
      adDiv.innerHTML = `
        <h3>${ad.title}</h3>
        <p><strong>Тип:</strong> ${ad.type === 'offer' ? 'Предложение' : 'Запрос'}</p>
        <p><strong>Категория:</strong> ${ad.category}</p>
        <p>${ad.description}</p>
        <p><small>Создано: ${new Date(ad.created_at).toLocaleDateString()}</small></p>
      `;
      adsList.appendChild(adDiv);
    });
  } catch (error) {
    document.getElementById('ads-list').innerHTML = '<p>Ошибка загрузки объявлений: ' + error.message + '</p>';
  }
}

// Attach logout function to button
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn').addEventListener('click', logout);
});