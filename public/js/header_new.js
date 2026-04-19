const headerTemplate = `
<header>
  <div class="header-content">
    <div class="logo"><a href="/">Соседик</a></div>
    <nav id="main-nav">
      <div id="nav-guest">
        <a href="/">Главная</a>
        <a href="/login.html">Войти</a>
      </div>
      <div id="nav-auth" class="hidden">
        <div class="notification-container">
          <a href="/notifications.html" class="notification-link" id="notification-bell">
            <img src="/notification.png" alt="Уведомления">
            <span class="notification-count hidden" id="notification-count"></span>
          </a>
          <div class="notification-popup" id="notification-popup">
            <div class="notification-header">
              <h4>Уведомления</h4>
            </div>
            <div class="notification-list" id="notification-list">
              <p class="no-notifications">Загрузка уведомлений...</p>
            </div>
            <div class="notification-footer">
              <a href="/notifications.html" class="view-all-link">Все уведомления</a>
            </div>
          </div>
        </div>
        <a href="/">Главная</a>
        <a href="/ads.html">Объявления</a>
        <a href="/rentals.html">Аренда</a>
        <a href="/chats.html">Чаты</a>
        <a href="/profile.html">Профиль</a>
        <a href="#" onclick="logout(); return false;">Выйти</a>
      </div>
    </nav>
    <button class="hamburger" id="hamburger-btn" aria-label="Меню">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>
</header>
`;

function initHeader() {
  const headerRoot = document.getElementById('header-root');
  if (!headerRoot) return;

  headerRoot.innerHTML = headerTemplate;

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mainNav = document.getElementById('main-nav');
  const guestNav = document.getElementById('nav-guest');
  const authNav = document.getElementById('nav-auth');
  const notificationBell = document.getElementById('notification-bell');
  const notificationPopup = document.getElementById('notification-popup');
  const notificationList = document.getElementById('notification-list');
  const notificationCount = document.getElementById('notification-count');

  function logout(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('sosedik_token');
    window.location.href = '/login.html';
  }

  window.logout = logout;

  const token = localStorage.getItem('sosedik_token');

  if (token) {
    guestNav.classList.add('hidden');
    authNav.classList.remove('hidden');
    loadNotifications(token);
  } else {
    guestNav.classList.remove('hidden');
    authNav.classList.add('hidden');
  }

  if (hamburgerBtn && mainNav) {
    hamburgerBtn.addEventListener('click', () => {
      hamburgerBtn.classList.toggle('active');
      mainNav.classList.toggle('active');
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        mainNav.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!hamburgerBtn.contains(e.target) && !mainNav.contains(e.target)) {
        hamburgerBtn.classList.remove('active');
        mainNav.classList.remove('active');
      }
    });
  }

  if (notificationBell && notificationPopup) {
    const hidePopup = () => {
      notificationPopup.classList.remove('show');
    };

    notificationBell.addEventListener('mouseenter', () => {
      notificationPopup.classList.add('show');
    });

    notificationBell.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (!notificationPopup.matches(':hover')) {
          hidePopup();
        }
      }, 100);
    });

    notificationPopup.addEventListener('mouseleave', hidePopup);
  }

  async function loadNotifications(tokenValue) {
    if (!notificationList || !notificationCount) return;

    try {
      const response = await fetch('/api/notifications?limit=5', {
        headers: {
          'Authorization': `Bearer ${tokenValue}`
        }
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить уведомления');
      }

      const data = await response.json();
      const notifications = data.notifications || [];
      const unreadCount = data.unreadCount || 0;

      if (unreadCount > 0) {
        notificationCount.textContent = unreadCount > 99 ? '99+' : unreadCount;
        notificationCount.classList.remove('hidden');
      } else {
        notificationCount.classList.add('hidden');
      }

      if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">У вас нет уведомлений</p>';
        return;
      }

      notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.is_read ? 'read' : 'unread'}">
          <div class="notification-content">
            <p>${notification.message}</p>
            <small>${new Date(notification.created_at).toLocaleString()}</small>
          </div>
          ${notification.is_read ? '' : '<div class="unread-indicator"></div>'}
        </div>
      `).join('');
    } catch (error) {
      notificationList.innerHTML = '<p class="no-notifications">Ошибка загрузки уведомлений</p>';
      console.error(error);
    }
  }
}

document.addEventListener('DOMContentLoaded', initHeader);
