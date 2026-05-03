const headerTemplate = `
<header>
  <div class="header-content">
    <div class="logo"><a href="/">Соседик</a></div>
    <div class="notification-container" id="notification-container">
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
    <nav id="main-nav">
      <div id="nav-guest">
  <a href="/">Главная</a>
  <a href="/ads.html">Объявления</a>
  <a href="/rentals.html">Аренда</a>
  <a href="/login.html">Войти</a>
</div>
      <div id="nav-auth" class="hidden">
        <a href="/">Главная</a>
        <a href="/ads.html">Объявления</a>
        <a href="/rentals.html">Аренда</a>
        <a href="/elections.html">Голосования</a>
        <a href="/chats.html">Чаты</a>
        <a href="/profile.html">Профиль</a>
        <a href="#" onclick="logout(); return false;">Выйти</a>
      </div>
    </nav>
    <div class="header-actions">
      <button class="hamburger" id="hamburger-btn" aria-label="Меню">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </div>
</header>
`;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
function initHeader() {
  const headerRoot = document.getElementById('header-root');
  if (!headerRoot) return;

  // Set mobile/desktop class based on actual innerWidth
  function updateDeviceClass() {
    if (window.innerWidth <= 768) {
      document.body.classList.add('mobile');
      document.body.classList.remove('desktop');
    } else {
      document.body.classList.add('desktop');
      document.body.classList.remove('mobile');
    }
  }

  updateDeviceClass();
  window.addEventListener('resize', updateDeviceClass);

  headerRoot.innerHTML = headerTemplate;

  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mainNav = document.getElementById('main-nav');
  const guestNav = document.getElementById('nav-guest');
  const authNav = document.getElementById('nav-auth');
  const notificationContainer = document.getElementById('notification-container');
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
    if (notificationContainer) notificationContainer.classList.remove('hidden');
    loadNotifications(token);
    // Автообновление уведомлений каждые 3 секунды
    setInterval(() => {
      loadNotifications(token);
    }, 3000);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Уровень пользователя:', payload.level);
        if (payload.level >= 4) {
          const adminLink = document.createElement('a');
          adminLink.href = '/admin.html';
          adminLink.textContent = 'Админ';
          adminLink.style.color = '#ffd700'; // золотистый цвет, чтобы выделялось
          document.getElementById('nav-auth').appendChild(adminLink);
        }
      } catch (e) { }
    }
  } else {
    guestNav.classList.remove('hidden');
    authNav.classList.add('hidden');
    if (notificationContainer) notificationContainer.classList.add('hidden');
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
        headers: { 'Authorization': `Bearer ${tokenValue}` }
      });
      if (!response.ok) throw new Error('Не удалось загрузить уведомления');
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
        <div class="notification-item ${notification.is_read ? 'read' : 'unread'}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #edf2f7;"
          data-id="${notification.id}"  
          data-type="${notification.type}"
          data-related-id="${notification.related_id || ''}"
          data-related-type="${notification.related_type || ''}">
          <div class="notification-content" style="flex:1; font-size:0.85rem; color:#1a202c;">
            ${escapeHtml(notification.message)}
            <small style="display:block; font-size:0.7rem; color:#718096;">${new Date(notification.created_at).toLocaleString()}</small>
          </div>
          <div class="notification-actions" style="display:flex; align-items:center; gap:8px; margin-left:12px;">
            ${!notification.is_read ? `<span class="mark-read-popup" data-id="${notification.id}" style="font-size:0.75rem; color:#718096; cursor:pointer; text-decoration:none;">Отметить как прочитанное</span>` : ''}
            <button class="delete-icon-popup" data-id="${notification.id}" style="background:none; border:none; cursor:pointer; padding:4px; display:flex; align-items:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" stroke="#9ca3af" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          ${!notification.is_read ? '<div class="unread-indicator"></div>' : ''}
        </div>
      `).join('');

      // Обработчик для "Прочитано"
      document.querySelectorAll('.mark-read-popup').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = el.dataset.id;
          await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${tokenValue}` }
          });
          loadNotifications(tokenValue);
          // Отправить событие для синхронизации страницы уведомлений
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        });
      });
      // Обработчик для "Удалить"
      document.querySelectorAll('.delete-icon-popup').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          await fetch(`/api/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenValue}` }
          });
          loadNotifications(tokenValue);
          // Отправить событие для синхронизации страницы уведомлений
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        });
      });

      // Обработчик клика по карточке уведомления в попапе
      document.querySelectorAll('.notification-item').forEach(card => {
        card.addEventListener('click', async (e) => {
          if (e.target.closest('.delete-icon-popup') || e.target.closest('.mark-read-popup')) return;
          const id = card.dataset.id;
          const type = card.dataset.type;
          const relatedId = card.dataset.relatedId;
          // Отметить прочитанным
          if (!card.classList.contains('read')) {
            await fetch(`/api/notifications/${id}/read`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${tokenValue}` }
            });
            card.classList.remove('unread');
            // Даём серверу время обработать запрос
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          // переход

          // Переход
          if (type === 'new_message' || type === 'request_completed') {
            window.location.href = relatedId ? `/request-chat.html?requestId=${relatedId}` : '/profile.html';
          } else if (type === 'new_request') {
            window.location.href = '/profile.html?tab=incoming';
          } else if (['request_accepted', 'request_started', 'request_pending_completion'].includes(type)) {
            window.location.href = '/profile.html?tab=active';
          } else if (type === 'request_rejected') {
            window.location.href = '/profile.html?tab=outgoing';
          } else if (type === 'request_proposal_created' || type === 'request_proposal_accepted') {
            window.location.href = '/profile.html?tab=active';
          } else if (type === 'request_proposal_declined') {
            window.location.href = '/profile.html?tab=active';
          } else if (type === 'return_proposed') {
            window.location.href = '/profile.html?tab=active';
          } else if (type === 'pending_request_cancelled') {
            window.location.href = '/profile.html';
          } else if (type === 'review_reminder') {
            window.location.href = '/profile.html?tab=deals';
          } else if (type === 'dispute_resolved') {
            window.location.href = '/profile.html?tab=active';
          } else if (type === 'friend_request' || type === 'friend_request_accepted') {
            window.location.href = '/profile.html?tab=friends';
          } else {
            window.location.href = '/profile.html';
          }
        });
      });

      const existingBulk = document.querySelector('.notification-bulk-actions');
      if (existingBulk) existingBulk.remove();

      const bulkDiv = document.createElement('div');
      bulkDiv.className = 'notification-bulk-actions';
      bulkDiv.style.cssText = 'display: flex; gap: 8px; padding: 8px 16px; border-top: 1px solid #edf2f7; margin-top: 4px; justify-content: flex-end;';
      bulkDiv.innerHTML = `
  <button id="mark-all-read-popup" class="btn-action btn-action-secondary" style="font-size: 12px; padding: 6px 12px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 4px; display: inline;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    Прочитанные
  </button>
  <button id="clear-all-popup" class="btn-action btn-action-danger" style="font-size: 12px; padding: 6px 12px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 4px; display: inline;">
      <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    Очистить
  </button>
`;
      const footer = document.querySelector('.notification-footer');
      if (footer) {
        footer.parentNode.insertBefore(bulkDiv, footer);
      }

      document.getElementById('mark-all-read-popup')?.addEventListener('click', async () => {
        await fetch('/api/notifications/read-all', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${tokenValue}` }
        });
        loadNotifications(tokenValue);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      });

      document.getElementById('clear-all-popup')?.addEventListener('click', async () => {
        await fetch('/api/notifications/clear', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${tokenValue}` }
        });
        loadNotifications(tokenValue);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      });
    } catch (error) {
      notificationList.innerHTML = '<p class="no-notifications">Ошибка загрузки уведомлений</p>';
      console.error(error);
    }
  }   // закрытие loadNotifications
}       // закрытие initHeader

document.addEventListener('DOMContentLoaded', initHeader);