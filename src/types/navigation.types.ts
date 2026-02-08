export type PageId = 'home' | 'tests' | 'test-taking' | 'results' | 'admin' | 'admin-tests' | 'admin-questions' | 'admin-categories';
export interface PageConfig { id: PageId; title: string; icon: string; requiresAuth: boolean; requiredRole?: 'instructor' | 'admin'; showInNav: boolean; parentId?: PageId; }
export const PAGES_CONFIG: Record<PageId, PageConfig> = {
  home: { id: 'home', title: 'Главная', icon: 'home', requiresAuth: false, showInNav: true },
  tests: { id: 'tests', title: 'Тесты', icon: 'file-text', requiresAuth: false, showInNav: true },
  'test-taking': { id: 'test-taking', title: 'Прохождение теста', icon: 'play', requiresAuth: false, showInNav: false },
  results: { id: 'results', title: 'Результаты', icon: 'award', requiresAuth: true, requiredRole: 'instructor', showInNav: true },
  admin: { id: 'admin', title: 'Администрирование', icon: 'settings', requiresAuth: true, requiredRole: 'admin', showInNav: true },
  'admin-tests': { id: 'admin-tests', title: 'Тесты', icon: 'file-text', requiresAuth: true, requiredRole: 'admin', showInNav: false, parentId: 'admin' },
  'admin-questions': { id: 'admin-questions', title: 'Вопросы', icon: 'help-circle', requiresAuth: true, requiredRole: 'admin', showInNav: false, parentId: 'admin' },
  'admin-categories': { id: 'admin-categories', title: 'Категории', icon: 'folder', requiresAuth: true, requiredRole: 'admin', showInNav: false, parentId: 'admin' },
};
