export type QuestionType = 'single' | 'multiple' | 'text';
export interface QuestionOption { id: string; text: string; isCorrect: boolean; }
export interface Question { id: string; testId: string; text: string; type: QuestionType; options: QuestionOption[]; points: number; isActive: boolean; createdAt: string; }
export interface QuestionFormData { testId: string; text: string; type: QuestionType; options: QuestionOption[]; points: number; }
export const getQuestionTypeLabel = (t: QuestionType): string => ({ single: 'Один ответ', multiple: 'Несколько ответов', text: 'Текстовый' }[t]);
