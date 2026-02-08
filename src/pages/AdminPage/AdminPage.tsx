import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, uiStore } from '@/store';
import { Card, Button, Table, Modal, Input, Select } from '@/components/UI';
import type { TableColumn } from '@/components/UI';
import type { Test, Category, TestFormData, CategoryFormData } from '@/types';
import styles from './AdminPage.module.scss';

type AdminTab = 'tests' | 'categories';

export const AdminPage = observer(() => {
  const { tests, categories, activeCategories, testsLoading, categoriesLoading, getCategoryById, createTest, updateTest, deleteTest, createCategory, deleteCategory } = dataStore;
  const [activeTab, setActiveTab] = useState<AdminTab>('tests');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testForm, setTestForm] = useState<TestFormData>({ title: '', description: '', categoryId: '', duration: 30, passingScore: 70 });
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({ name: '', description: '' });

  const resetForms = () => { setTestForm({ title: '', description: '', categoryId: '', duration: 30, passingScore: 70 }); setCategoryForm({ name: '', description: '' }); setEditingId(null); };
  const openCreateModal = () => { resetForms(); setModalMode('create'); setModalOpen(true); };
  const openEditModal = (item: Test | Category) => {
    setModalMode('edit'); setEditingId(item.id);
    if (activeTab === 'tests') { const t = item as Test; setTestForm({ title: t.title, description: t.description, categoryId: t.categoryId, duration: t.duration, passingScore: t.passingScore }); }
    else { const c = item as Category; setCategoryForm({ name: c.name, description: c.description || '' }); }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'tests') {
        if (!testForm.title) { uiStore.showError('Введите название'); return; }
        if (modalMode === 'create') await createTest(testForm); else if (editingId) await updateTest(editingId, testForm);
      } else {
        if (!categoryForm.name) { uiStore.showError('Введите название'); return; }
        if (modalMode === 'create') await createCategory(categoryForm);
      }
      uiStore.showSuccess('Сохранено'); setModalOpen(false); resetForms();
    } catch { uiStore.showError('Ошибка'); }
  };

  const handleDelete = (id: string) => { uiStore.showConfirm('Удаление', 'Удалить?', async () => {
    if (activeTab === 'tests') await deleteTest(id); else await deleteCategory(id);
    uiStore.showSuccess('Удалено');
  }); };

  const actionBtns = (row: Test | Category) => (
    <div className={styles.actions}>
      <Button size="sm" variant="ghost" onClick={() => openEditModal(row)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></Button>
      <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg></Button>
    </div>
  );

  const testColumns: TableColumn<Test>[] = [
    { key: 'title', title: 'Название' },
    { key: 'categoryId', title: 'Категория', render: (v: unknown) => getCategoryById(v as string)?.name || '—' },
    { key: 'duration', title: 'Мин.', width: '70px' },
    { key: 'questionsCount', title: 'Вопр.', width: '70px' },
    { key: 'actions', title: '', width: '100px', render: (_: unknown, r: Test) => actionBtns(r) },
  ];

  const categoryColumns: TableColumn<Category>[] = [
    { key: 'name', title: 'Название' },
    { key: 'description', title: 'Описание', render: (v: unknown) => (v as string)?.substring(0, 50) || '—' },
    { key: 'actions', title: '', width: '100px', render: (_: unknown, r: Category) => actionBtns(r) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}>Администрирование</h1></div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'tests' ? styles.active : ''}`} onClick={() => setActiveTab('tests')}>Тесты</button>
        <button className={`${styles.tab} ${activeTab === 'categories' ? styles.active : ''}`} onClick={() => setActiveTab('categories')}>Категории</button>
      </div>
      <Card className={styles.toolbar}><Button variant="primary" onClick={openCreateModal}>Добавить {activeTab === 'tests' ? 'тест' : 'категорию'}</Button></Card>
      <Card padding="none">
        {activeTab === 'tests' && <Table columns={testColumns} data={tests.filter(t => t.isActive)} keyField="id" loading={testsLoading} emptyText="Нет тестов" />}
        {activeTab === 'categories' && <Table columns={categoryColumns} data={categories.filter(c => c.isActive)} keyField="id" loading={categoriesLoading} emptyText="Нет категорий" />}
      </Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'create' ? 'Добавить' : 'Редактировать'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          {activeTab === 'tests' && (<>
            <Input label="Название *" value={testForm.title} onChange={e => setTestForm({ ...testForm, title: e.target.value })} />
            <Input label="Описание" value={testForm.description} onChange={e => setTestForm({ ...testForm, description: e.target.value })} />
            <Select label="Категория" options={activeCategories.map(c => ({ value: c.id, label: c.name }))} value={testForm.categoryId} onChange={e => setTestForm({ ...testForm, categoryId: e.target.value })} />
            <div className={styles.row}><Input label="Время (мин)" type="number" value={testForm.duration} onChange={e => setTestForm({ ...testForm, duration: parseInt(e.target.value) || 30 })} />
            <Input label="Проходной балл (%)" type="number" value={testForm.passingScore} onChange={e => setTestForm({ ...testForm, passingScore: parseInt(e.target.value) || 70 })} /></div>
          </>)}
          {activeTab === 'categories' && (<>
            <Input label="Название *" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} />
            <Input label="Описание" value={categoryForm.description || ''} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} />
          </>)}
        </div>
      </Modal>
    </div>
  );
});
