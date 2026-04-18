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
        <a href="#notifications" class="notification-link"><img src="/notification.png" alt="Уведомления"></a>
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
}

document.addEventListener('DOMContentLoaded', initHeader);
