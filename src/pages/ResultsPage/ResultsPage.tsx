import { observer } from 'mobx-react-lite';
import { dataStore } from '@/store';
import { Card, Table, Select, Badge } from '@/components/UI';
import type { TableColumn } from '@/components/UI';
import type { TestResult } from '@/types';
import styles from './ResultsPage.module.scss';

export const ResultsPage = observer(() => {
  const { filteredResults, activeTests, resultsLoading, getTestById, setFilter, filters, passRate } = dataStore;

  const testOptions = [{ value: '', label: 'Все тесты' }, ...activeTests.map(t => ({ value: t.id, label: t.title }))];
  const passedOptions = [{ value: '', label: 'Все результаты' }, { value: 'true', label: 'Сдано' }, { value: 'false', label: 'Не сдано' }];

  const columns: TableColumn<TestResult>[] = [
    { key: 'completedAt', title: 'Дата', width: '150px', render: (v: unknown) => new Date(v as string).toLocaleString('ru-RU') },
    { key: 'userName', title: 'Участник' },
    { key: 'testId', title: 'Тест', render: (v: unknown) => getTestById(v as string)?.title || 'Неизвестный' },
    { key: 'percentage', title: 'Результат', width: '100px', render: (v: unknown) => `${v}%` },
    { key: 'passed', title: 'Статус', width: '100px', render: (v: unknown) => <Badge variant={(v as boolean) ? 'success' : 'error'}>{(v as boolean) ? 'Сдано' : 'Не сдано'}</Badge> },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Результаты</h1><p className={styles.subtitle}>Статистика прохождения тестов</p></div>
      </div>

      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{filteredResults.length}</div>
          <div className={styles.statLabel}>Всего попыток</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{filteredResults.filter(r => r.passed).length}</div>
          <div className={styles.statLabel}>Успешных</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={`${styles.statValue} ${passRate >= 70 ? styles.success : styles.warning}`}>{passRate}%</div>
          <div className={styles.statLabel}>Процент сдачи</div>
        </Card>
      </div>

      <Card className={styles.filters}>
        <Select options={testOptions} value={filters.testId || ''} onChange={e => setFilter('testId', e.target.value || undefined)} />
        <Select options={passedOptions} value={filters.passed === undefined ? '' : String(filters.passed)} onChange={e => setFilter('passed', e.target.value === '' ? undefined : e.target.value === 'true')} />
      </Card>

      <Card padding="none">
        <Table columns={columns} data={filteredResults} keyField="id" loading={resultsLoading} emptyText="Нет результатов" />
      </Card>
    </div>
  );
});
