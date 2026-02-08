export interface Test { id: string; title: string; description: string; categoryId: string; duration: number; passingScore: number; questionsCount: number; isActive: boolean; createdAt: string; updatedAt: string; }
export interface TestFormData { title: string; description: string; categoryId: string; duration: number; passingScore: number; }
