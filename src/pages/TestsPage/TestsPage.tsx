import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import { dataStore, authStore, uiStore, navigationStore } from '@/store';
import { Card, Button, Input, Select, Badge, Modal } from '@/components/UI';
import type { Test, TestFormData, QuestionFormData, QuestionOption, QuestionType } from '@/types';
import styles from './TestsPage.module.scss';

interface QuestionDraft {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  points: number;
}

const emptyQuestion = (): QuestionDraft => ({
  id: uuidv4(),
  text: '',
  type: 'single',
  options: [
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
  ],
  points: 1,
});

const questionTypeOptions = [
  { value: 'single', label: 'Один ответ' },
  { value: 'multiple', label: 'Несколько ответов' },
  { value: 'text', label: 'Текстовый ответ' },
];

export const TestsPage = observer(() => {
  const { filteredTests, activeCategories, testsLoading, getCategoryById, createTest, updateTest, deleteTest, setFilter, filters, getQuestionsForTest, saveQuestionsForTest } = dataStore;
  const { isInstructor } = authStore;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestFormData>({ title: '', description: '', categoryId: '', duration: 30, passingScore: 70 });
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ title: '', description: '', categoryId: '', duration: 30, passingScore: 70 });
    setEditingId(null);
    setQuestions([]);
    setExpandedQ(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = (t: Test) => {
    setModalMode('edit');
    setEditingId(t.id);
    setForm({ title: t.title, description: t.description, categoryId: t.categoryId, duration: t.duration, passingScore: t.passingScore });
    // Load existing questions
    const existingQuestions = getQuestionsForTest(t.id);
    setQuestions(existingQuestions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options.map(o => ({ ...o })),
      points: q.points,
    })));
    setExpandedQ(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.categoryId) { uiStore.showError('Заполните обязательные поля'); return; }
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { uiStore.showError(`Вопрос ${i + 1}: введите текст вопроса`); return; }
      if (q.type !== 'text') {
        if (q.options.length < 2) { uiStore.showError(`Вопрос ${i + 1}: нужно минимум 2 варианта ответа`); return; }
        const hasEmpty = q.options.some(o => !o.text.trim());
        if (hasEmpty) { uiStore.showError(`Вопрос ${i + 1}: заполните все варианты ответа`); return; }
        const hasCorrect = q.options.some(o => o.isCorrect);
        if (!hasCorrect) { uiStore.showError(`Вопрос ${i + 1}: отметьте правильный ответ`); return; }
      }
    }
    try {
      let testId = editingId;
      if (modalMode === 'create') {
        const created = await createTest(form);
        if (created) testId = created.id;
        else { uiStore.showError('Ошибка создания теста'); return; }
      } else if (editingId) {
        await updateTest(editingId, form);
      }
      // Save questions
      if (testId) {
        const questionsData: QuestionFormData[] = questions.map(q => ({
          testId,
          text: q.text,
          type: q.type,
          options: q.type === 'text' ? [{ id: uuidv4(), text: '', isCorrect: true }] : q.options,
          points: q.points,
        }));
        await saveQuestionsForTest(testId, questionsData);
      }
      uiStore.showSuccess(modalMode === 'create' ? 'Тест создан' : 'Тест обновлён');
      setModalOpen(false);
      resetForm();
    } catch { uiStore.showError('Ошибка сохранения'); }
  };

  const handleDelete = (id: string) => {
    uiStore.showConfirm('Удаление', 'Удалить тест?', async () => { await deleteTest(id); uiStore.showSuccess('Тест удалён'); });
  };

  const handleStartTest = (testId: string) => {
    const testQuestions = getQuestionsForTest(testId);
    if (testQuestions.length === 0) {
      uiStore.showWarning('В этом тесте пока нет вопросов');
      return;
    }
    navigationStore.navigateToTest(testId);
  };

  // Question builder helpers
  const addQuestion = () => {
    const q = emptyQuestion();
    setQuestions([...questions, q]);
    setExpandedQ(q.id);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (expandedQ === id) setExpandedQ(null);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, options: [...q.options, { id: uuidv4(), text: '', isCorrect: false }] };
    }));
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, options: q.options.filter(o => o.id !== optionId) };
    }));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<QuestionOption>) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        options: q.options.map(o => {
          if (o.id !== optionId) {
            // For single-choice: uncheck other options when one is checked
            if (q.type === 'single' && updates.isCorrect) return { ...o, isCorrect: false };
            return o;
          }
          return { ...o, ...updates };
        }),
      };
    }));
  };

  const handleTypeChange = (questionId: string, newType: QuestionType) => {
    setQuestions(questions.map(q => {
      if (q.id !== questionId) return q;
      if (newType === 'text') {
        return { ...q, type: newType, options: [] };
      }
      if (q.type === 'text') {
        return { ...q, type: newType, options: [{ id: uuidv4(), text: '', isCorrect: false }, { id: uuidv4(), text: '', isCorrect: false }] };
      }
      // When switching from single to multiple or vice versa, reset correct answers
      return { ...q, type: newType, options: q.options.map(o => ({ ...o, isCorrect: false })) };
    }));
  };

  const categoryOptions = [{ value: '', label: 'Все категории' }, ...activeCategories.map(c => ({ value: c.id, label: c.name }))];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>Тесты</h1><p className={styles.subtitle}>Доступные тесты для прохождения</p></div>
        {isInstructor && <Button variant="primary" onClick={openCreateModal}>Создать тест</Button>}
      </div>

      <Card className={styles.filters}>
        <Input placeholder="Поиск тестов..." value={filters.search || ''} onChange={e => setFilter('search', e.target.value || undefined)} />
        <Select options={categoryOptions} value={filters.categoryId || ''} onChange={e => setFilter('categoryId', e.target.value || undefined)} />
      </Card>

      {testsLoading ? <p>Загрузка...</p> : (
        <div className={styles.testGrid}>
          {filteredTests.map(t => (
            <Card key={t.id} className={styles.testCard}>
              <Badge variant="info">{getCategoryById(t.categoryId)?.name || 'Без категории'}</Badge>
              <h3 className={styles.testTitle}>{t.title}</h3>
              <p className={styles.testDesc}>{t.description.substring(0, 100)}{t.description.length > 100 ? '...' : ''}</p>
              <div className={styles.testMeta}>
                <span>⏱ {t.duration} мин</span>
                <span>📝 {t.questionsCount} вопр.</span>
                <span>✓ {t.passingScore}%</span>
              </div>
              <div className={styles.testActions}>
                <Button variant="primary" size="sm" onClick={() => handleStartTest(t.id)}>Начать тест</Button>
                {isInstructor && <>
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(t)}>Изменить</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>Удалить</Button>
                </>}
              </div>
            </Card>
          ))}
          {filteredTests.length === 0 && <p className={styles.empty}>Тесты не найдены</p>}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'create' ? 'Создать тест' : 'Редактировать тест'} size="lg"
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button><Button variant="primary" onClick={handleSave}>Сохранить</Button></div>}>
        <div className={styles.form}>
          <Input label="Название *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Select label="Категория *" options={activeCategories.map(c => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} />
          <div className={styles.row}>
            <Input label="Время (мин)" type="number" min={5} value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} />
            <Input label="Проходной балл (%)" type="number" min={0} max={100} value={form.passingScore} onChange={e => setForm({ ...form, passingScore: parseInt(e.target.value) || 70 })} />
          </div>

          {/* Question Constructor */}
          <div className={styles.questionsSection}>
            <div className={styles.questionsSectionHeader}>
              <h3 className={styles.questionsSectionTitle}>Вопросы ({questions.length})</h3>
              <Button variant="primary" size="sm" onClick={addQuestion}>+ Добавить вопрос</Button>
            </div>

            {questions.length === 0 && (
              <p className={styles.questionsEmpty}>Нажмите «Добавить вопрос», чтобы создать вопросы для теста</p>
            )}

            <div className={styles.questionsList}>
              {questions.map((q, idx) => (
                <div key={q.id} className={`${styles.questionItem} ${expandedQ === q.id ? styles.questionExpanded : ''}`}>
                  <div className={styles.questionHeader} onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                    <div className={styles.questionHeaderLeft}>
                      <span className={styles.questionNumber}>{idx + 1}</span>
                      <span className={styles.questionPreview}>
                        {q.text || 'Новый вопрос'}
                      </span>
                      <Badge variant={q.type === 'single' ? 'info' : q.type === 'multiple' ? 'primary' : 'warning'} size="sm">
                        {q.type === 'single' ? 'Один' : q.type === 'multiple' ? 'Несколько' : 'Текст'}
                      </Badge>
                    </div>
                    <div className={styles.questionHeaderRight}>
                      <span className={styles.questionPoints}>{q.points} б.</span>
                      <button className={styles.questionDelete} onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }} title="Удалить вопрос">✕</button>
                      <span className={styles.questionChevron}>{expandedQ === q.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expandedQ === q.id && (
                    <div className={styles.questionBody}>
                      <Input
                        label="Текст вопроса *"
                        value={q.text}
                        onChange={e => updateQuestion(q.id, { text: e.target.value })}
                        placeholder="Введите текст вопроса..."
                      />
                      <div className={styles.row}>
                        <Select
                          label="Тип вопроса"
                          options={questionTypeOptions}
                          value={q.type}
                          onChange={e => handleTypeChange(q.id, e.target.value as QuestionType)}
                        />
                        <Input
                          label="Баллы"
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={e => updateQuestion(q.id, { points: parseInt(e.target.value) || 1 })}
                        />
                      </div>

                      {q.type !== 'text' && (
                        <div className={styles.optionsSection}>
                          <label className={styles.optionsLabel}>
                            Варианты ответа {q.type === 'single' ? '(выберите один правильный)' : '(отметьте все правильные)'}
                          </label>
                          <div className={styles.optionsList}>
                            {q.options.map((opt, optIdx) => (
                              <div key={opt.id} className={styles.optionItem}>
                                <label className={styles.optionCheck}>
                                  <input
                                    type={q.type === 'single' ? 'radio' : 'checkbox'}
                                    name={`correct-${q.id}`}
                                    checked={opt.isCorrect}
                                    onChange={() => updateOption(q.id, opt.id, { isCorrect: q.type === 'single' ? true : !opt.isCorrect })}
                                    className={styles.optionCheckInput}
                                  />
                                  <span className={`${styles.optionCheckmark} ${opt.isCorrect ? styles.optionCorrect : ''}`}>
                                    {opt.isCorrect ? '✓' : ''}
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  className={styles.optionTextInput}
                                  value={opt.text}
                                  onChange={e => updateOption(q.id, opt.id, { text: e.target.value })}
                                  placeholder={`Вариант ${optIdx + 1}`}
                                />
                                {q.options.length > 2 && (
                                  <button className={styles.optionRemove} onClick={() => removeOption(q.id, opt.id)} title="Удалить вариант">✕</button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => addOption(q.id)}>+ Добавить вариант</Button>
                        </div>
                      )}

                      {q.type === 'text' && (
                        <p className={styles.textQuestionHint}>Ответ вводится пользователем в свободной форме</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
});
