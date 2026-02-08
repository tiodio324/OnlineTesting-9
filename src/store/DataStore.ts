import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { Test, TestFormData, Question, QuestionFormData, TestResult, Category, CategoryFormData, FilterParams } from '@/types';
import FirebaseService from '@/firebase';
import { authStore } from './AuthStore';

export class DataStore {
  tests: Test[] = []; questions: Question[] = []; results: TestResult[] = []; categories: Category[] = [];
  testsLoading = false; questionsLoading = false; resultsLoading = false; categoriesLoading = false;
  error: string | null = null; filters: FilterParams = {};

  constructor() { makeAutoObservable(this, {}, { autoBind: true }); }

  get activeTests(): Test[] { return this.tests.filter(t => t.isActive).sort((a, b) => a.title.localeCompare(b.title, 'ru')); }
  get activeCategories(): Category[] { return this.categories.filter(c => c.isActive).sort((a, b) => a.name.localeCompare(b.name, 'ru')); }
  get activeResults(): TestResult[] { return this.results.filter(r => r.isActive).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()); }
  
  get filteredTests(): Test[] {
    let r = this.activeTests;
    if (this.filters.categoryId) r = r.filter(t => t.categoryId === this.filters.categoryId);
    if (this.filters.search) { const s = this.filters.search.toLowerCase(); r = r.filter(t => t.title.toLowerCase().includes(s)); }
    return r;
  }

  get filteredResults(): TestResult[] {
    let r = this.activeResults;
    if (this.filters.testId) r = r.filter(res => res.testId === this.filters.testId);
    if (this.filters.passed !== undefined) r = r.filter(res => res.passed === this.filters.passed);
    return r;
  }

  get passRate(): number { const passed = this.activeResults.filter(r => r.passed).length; return this.activeResults.length ? Math.round((passed / this.activeResults.length) * 100) : 0; }

  getTestById = (id: string): Test | undefined => this.tests.find(t => t.id === id);
  getCategoryById = (id: string): Category | undefined => this.categories.find(c => c.id === id);
  getQuestionsForTest = (testId: string): Question[] => this.questions.filter(q => q.testId === testId && q.isActive);

  loadAllData = async (): Promise<void> => { await Promise.all([this.loadTests(), this.loadQuestions(), this.loadResults(), this.loadCategories()]); };

  loadTests = async (): Promise<void> => { this.testsLoading = true; try { const d = await FirebaseService.getData<Record<string, Test>>('tests'); runInAction(() => { this.tests = d ? Object.values(d) : []; this.testsLoading = false; }); } catch { runInAction(() => { this.error = 'Ошибка загрузки тестов'; this.testsLoading = false; }); } };
  loadQuestions = async (): Promise<void> => { this.questionsLoading = true; try { const d = await FirebaseService.getData<Record<string, Question>>('questions'); runInAction(() => { this.questions = d ? Object.values(d) : []; this.questionsLoading = false; }); } catch { runInAction(() => { this.error = 'Ошибка загрузки вопросов'; this.questionsLoading = false; }); } };
  loadResults = async (): Promise<void> => { this.resultsLoading = true; try { const d = await FirebaseService.getData<Record<string, TestResult>>('results'); runInAction(() => { this.results = d ? Object.values(d) : []; this.resultsLoading = false; }); } catch { runInAction(() => { this.error = 'Ошибка загрузки результатов'; this.resultsLoading = false; }); } };
  loadCategories = async (): Promise<void> => { this.categoriesLoading = true; try { const d = await FirebaseService.getData<Record<string, Category>>('categories'); runInAction(() => { this.categories = d ? Object.values(d) : []; this.categoriesLoading = false; }); } catch { runInAction(() => { this.error = 'Ошибка загрузки категорий'; this.categoriesLoading = false; }); } };

  createTest = async (data: TestFormData): Promise<Test | null> => { if (!authStore.canManageTests()) return null; const now = new Date().toISOString(); const t: Test = { id: uuidv4(), ...data, questionsCount: 0, isActive: true, createdAt: now, updatedAt: now }; try { await FirebaseService.setData(`tests/${t.id}`, t); runInAction(() => { this.tests.push(t); }); return t; } catch { return null; } };
  updateTest = async (id: string, data: Partial<TestFormData>): Promise<boolean> => { if (!authStore.canManageTests()) return false; const i = this.tests.findIndex(t => t.id === id); if (i === -1) return false; const u = { ...this.tests[i], ...data, updatedAt: new Date().toISOString() }; try { await FirebaseService.setData(`tests/${id}`, u); runInAction(() => { this.tests[i] = u; }); return true; } catch { return false; } };
  deleteTest = async (id: string): Promise<boolean> => { if (!authStore.canManageTests()) return false; const i = this.tests.findIndex(t => t.id === id); if (i === -1) return false; try { await FirebaseService.updateData(`tests/${id}`, { isActive: false }); runInAction(() => { this.tests[i].isActive = false; }); return true; } catch { return false; } };

  createQuestion = async (data: QuestionFormData): Promise<Question | null> => { if (!authStore.canManageQuestions()) return null; const now = new Date().toISOString(); const q: Question = { id: uuidv4(), ...data, isActive: true, createdAt: now }; try { await FirebaseService.setData(`questions/${q.id}`, q); runInAction(() => { this.questions.push(q); const ti = this.tests.findIndex(t => t.id === data.testId); if (ti !== -1) this.tests[ti].questionsCount++; }); return q; } catch { return null; } };
  deleteQuestion = async (id: string): Promise<boolean> => { if (!authStore.canManageQuestions()) return false; const i = this.questions.findIndex(q => q.id === id); if (i === -1) return false; try { await FirebaseService.updateData(`questions/${id}`, { isActive: false }); runInAction(() => { this.questions[i].isActive = false; }); return true; } catch { return false; } };

  saveQuestionsForTest = async (testId: string, questionsData: QuestionFormData[]): Promise<boolean> => {
    if (!authStore.canManageTests()) return false;
    try {
      // Delete existing questions for this test
      const existing = this.questions.filter(q => q.testId === testId && q.isActive);
      for (const q of existing) {
        await FirebaseService.updateData(`questions/${q.id}`, { isActive: false });
        runInAction(() => { const idx = this.questions.findIndex(x => x.id === q.id); if (idx !== -1) this.questions[idx].isActive = false; });
      }
      // Create new questions
      const now = new Date().toISOString();
      for (const data of questionsData) {
        const q: Question = { id: uuidv4(), ...data, testId, isActive: true, createdAt: now };
        await FirebaseService.setData(`questions/${q.id}`, q);
        runInAction(() => { this.questions.push(q); });
      }
      // Update questionsCount on the test
      const ti = this.tests.findIndex(t => t.id === testId);
      if (ti !== -1) {
        const count = questionsData.length;
        await FirebaseService.updateData(`tests/${testId}`, { questionsCount: count, updatedAt: now });
        runInAction(() => { this.tests[ti].questionsCount = count; this.tests[ti].updatedAt = now; });
      }
      return true;
    } catch { return false; }
  };

  createCategory = async (data: CategoryFormData): Promise<Category | null> => { if (!authStore.canAccessAdmin()) return null; const now = new Date().toISOString(); const c: Category = { id: uuidv4(), ...data, description: data.description || '', isActive: true, createdAt: now, updatedAt: now }; try { await FirebaseService.setData(`categories/${c.id}`, c); runInAction(() => { this.categories.push(c); }); return c; } catch { return null; } };
  deleteCategory = async (id: string): Promise<boolean> => { if (!authStore.canAccessAdmin()) return false; const i = this.categories.findIndex(c => c.id === id); if (i === -1) return false; try { await FirebaseService.updateData(`categories/${id}`, { isActive: false }); runInAction(() => { this.categories[i].isActive = false; }); return true; } catch { return false; } };

  submitResult = async (result: Omit<TestResult, 'id' | 'isActive'>): Promise<TestResult | null> => { const r: TestResult = { id: uuidv4(), ...result, isActive: true }; try { await FirebaseService.setData(`results/${r.id}`, r); runInAction(() => { this.results.push(r); }); return r; } catch { return null; } };

  setFilter = (key: keyof FilterParams, value: string | boolean | undefined): void => { this.filters = { ...this.filters, [key]: value }; };
  clearFilters = (): void => { this.filters = {}; };
  clearError = (): void => { this.error = null; };
}

export const dataStore = new DataStore();
