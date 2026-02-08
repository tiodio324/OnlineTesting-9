import { observer } from 'mobx-react-lite';
import { authStore, navigationStore } from '@/store';
import { Button } from '@/components/UI';
import styles from './Header.module.scss';

export const Header = observer(() => {
  const { isAuthenticated, currentRole, logout, openLoginModal } = authStore;
  const { pageTitle, toggleMobileMenu, mobileMenuOpen, navigate } = navigationStore;

  const getRoleName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      default: return 'Гость';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button 
          className={styles.menuButton}
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </>
            )}
          </svg>
        </button>
        <div
          className={styles.logo}
          onClick={() => navigate('home')}
          aria-label="Перейти на главную страницу"
        >
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className={styles.logoText}>Онлайн тестирование</span>
        </div>
      </div>

      <div className={styles.center}>
        <span className={styles.titlePrefix}>Текущая страница:</span>
        <h1 className={styles.title}>{pageTitle}</h1>
      </div>

      <div className={styles.right}>
        {isAuthenticated ? (
          <div className={styles.userInfo}>
            <span className={styles.role}>{getRoleName(currentRole)}</span>
            <Button variant="ghost" size="sm" onClick={logout} className={styles.headerButton}>
              Выйти
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={openLoginModal} className={styles.headerButton}>
            Войти
          </Button>
        )}
      </div>
    </header>
  );
});
