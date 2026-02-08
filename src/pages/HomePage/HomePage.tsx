import { observer } from 'mobx-react-lite';
import { dataStore, authStore, navigationStore } from '@/store';
import { Card, Button, Badge } from '@/components/UI';
import styles from './HomePage.module.scss';

const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: 'primary' | 'success' | 'warning' | 'info'; }) => (
  <Card className={`${styles.statCard} ${styles[color]}`}>
    <div className={styles.statIcon}>{icon}</div>
    <div className={styles.statContent}><span className={styles.statValue}>{value}</span><span className={styles.statTitle}>{title}</span></div>
  </Card>
);

export const HomePage = observer(() => {
  const { activeTests, activeResults, passRate, testsLoading } = dataStore;
  const { isInstructor, isAdmin } = authStore;
  const { navigate } = navigationStore;

  return (
    <div className={styles.page}>
      <section className={styles.welcome}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>Онлайн-тестирование</h1>
          <p className={styles.welcomeText}>
            Платформа для проведения тестов и сертификации.
            {!isInstructor && ' Войдите для управления тестами.'}
          </p>
          {!authStore.isAuthenticated && (
            <Button variant="primary" size="lg" onClick={() => authStore.openLoginModal()}>Войти</Button>
          )}
        </div>
        <div className={styles.welcomeDecor}>
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M70 100 L90 120 L130 80" stroke="currentColor" strokeWidth="4" opacity="0.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      <section className={styles.stats}>
        <StatCard title="Тестов" value={testsLoading ? '...' : activeTests.length} color="primary"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>} />
        {isInstructor && <>
          <StatCard title="Результатов" value={activeResults.length} color="info"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>} />
          <StatCard title="% сдавших" value={`${passRate}%`} color={passRate >= 70 ? 'success' : 'warning'}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
        </>}
      </section>

      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Разделы</h2>
        <div className={styles.actionCards}>
          <Card className={styles.actionCard} hoverable onClick={() => navigate('tests')}>
            <div className={styles.actionIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
            </div>
            <h3>Тесты</h3>
            <p>Пройти тестирование</p>
            <Badge variant="primary">{activeTests.length} тестов</Badge>
          </Card>

          {isInstructor && (
            <Card className={styles.actionCard} hoverable onClick={() => navigate('results')}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
              </div>
              <h3>Результаты</h3>
              <p>Статистика прохождения</p>
            </Card>
          )}

          {isAdmin && (
            <Card className={styles.actionCard} hoverable onClick={() => navigate('admin')}>
              <div className={styles.actionIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              </div>
              <h3>Администрирование</h3>
              <p>Управление системой</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
});
