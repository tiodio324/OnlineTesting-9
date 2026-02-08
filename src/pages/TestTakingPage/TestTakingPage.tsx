import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { dataStore, navigationStore, uiStore } from '@/store';
import { Card, Button, Badge } from '@/components/UI';
import styles from './TestTakingPage.module.scss';

export const TestTakingPage = observer(() => {
  const { activeTestId } = navigationStore;
  const test = activeTestId ? dataStore.getTestById(activeTestId) : null;
  const questions = activeTestId ? dataStore.getQuestionsForTest(activeTestId) : [];

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean } | null>(null);
  const [startedAt] = useState(new Date().toISOString());

  // Initialize timer when test loads
  useEffect(() => {
    if (test && !timerStarted) {
      setTimeLeft(test.duration * 60);
      setTimerStarted(true);
    }
  }, [test, timerStarted]);

  // Countdown timer using setTimeout chain
  useEffect(() => {
    if (isFinished || timeLeft <= 0 || !timerStarted) return;

    const id = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [timeLeft, isFinished, timerStarted]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    if (isFinished) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleMultipleAnswer = (questionId: string, optionId: string) => {
    if (isFinished) return;
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    if (isFinished) return;
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const calculateResult = useCallback(() => {
    let score = 0;
    let maxScore = 0;

    for (const q of questions) {
      maxScore += q.points;
      const answer = answers[q.id];

      if (q.type === 'single') {
        const correctOption = q.options.find(o => o.isCorrect);
        if (correctOption && answer === correctOption.id) {
          score += q.points;
        }
      } else if (q.type === 'multiple') {
        const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
        const selectedIds = (answer as string[]) || [];
        const allCorrect = correctIds.length === selectedIds.length &&
          correctIds.every(id => selectedIds.includes(id));
        if (allCorrect) {
          score += q.points;
        }
      } else if (q.type === 'text') {
        // Text questions: auto-awarded (instructor reviews later)
        if (answer && (answer as string).trim()) {
          score += q.points;
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = test ? percentage >= test.passingScore : false;

    return { score, maxScore, percentage, passed };
  }, [answers, questions, test]);

  const handleSubmit = async () => {
    const res = calculateResult();
    setResult(res);
    setIsFinished(true);

    // Save result to database
    if (test) {
      await dataStore.submitResult({
        testId: test.id,
        userName: 'Студент',
        userEmail: '',
        score: res.score,
        maxScore: res.maxScore,
        percentage: res.percentage,
        passed: res.passed,
        answers,
        startedAt,
        completedAt: new Date().toISOString(),
      });
    }
  };

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && timerStarted && !isFinished && test) {
      handleSubmit();
    }
  }, [timeLeft, timerStarted, isFinished, test]);

  const handleConfirmSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      uiStore.showConfirm(
        'Завершить тест?',
        `Вы ответили на ${answeredCount} из ${questions.length} вопросов. Завершить тест?`,
        handleSubmit
      );
    } else {
      handleSubmit();
    }
  };

  const handleBackToTests = () => {
    navigationStore.navigate('tests');
  };

  if (!test) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Тест не найден</h2>
          <Button variant="primary" onClick={handleBackToTests}>Вернуться к тестам</Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }).length;

  const timerDanger = timeLeft <= 60;
  const timerWarning = timeLeft <= 300 && !timerDanger;

  return (
    <div className={styles.page}>
      {/* Header with timer */}
      <div className={styles.testHeader}>
        <div className={styles.testHeaderLeft}>
          {!isFinished && (
            <Button variant="ghost" size="sm" onClick={handleBackToTests} className={styles.backBtn}>← Назад</Button>
          )}
          <div>
            <h1 className={styles.testTitle}>{test.title}</h1>
            <p className={styles.testSubtitle}>
              {isFinished ? 'Тест завершён' : `${answeredCount} из ${questions.length} вопросов отвечено`}
            </p>
          </div>
        </div>
        {!isFinished && (
          <div className={`${styles.timer} ${timerDanger ? styles.timerDanger : ''} ${timerWarning ? styles.timerWarning : ''}`}>
            <span className={styles.timerIcon}>⏱</span>
            <span className={styles.timerValue}>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isFinished && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </div>
      )}

      {/* Results card */}
      {isFinished && result && (
        <Card className={`${styles.resultCard} ${result.passed ? styles.resultPassed : styles.resultFailed}`}>
          <div className={styles.resultHeader}>
            <span className={styles.resultEmoji}>{result.passed ? '🎉' : '😔'}</span>
            <h2 className={styles.resultTitle}>{result.passed ? 'Тест пройден!' : 'Тест не пройден'}</h2>
          </div>
          <div className={styles.resultStats}>
            <div className={styles.resultStat}>
              <span className={styles.resultStatValue}>{result.percentage}%</span>
              <span className={styles.resultStatLabel}>Результат</span>
            </div>
            <div className={styles.resultStat}>
              <span className={styles.resultStatValue}>{result.score}/{result.maxScore}</span>
              <span className={styles.resultStatLabel}>Баллы</span>
            </div>
            <div className={styles.resultStat}>
              <span className={styles.resultStatValue}>{test.passingScore}%</span>
              <span className={styles.resultStatLabel}>Проходной балл</span>
            </div>
          </div>
          <Button variant="primary" onClick={handleBackToTests}>Вернуться к тестам</Button>
        </Card>
      )}

      {/* Questions */}
      <div className={styles.questionsList}>
        {questions.map((q, idx) => (
          <Card key={q.id} className={styles.questionCard}>
            <div className={styles.questionTop}>
              <span className={styles.questionNum}>Вопрос {idx + 1}</span>
              <Badge variant={q.type === 'single' ? 'info' : q.type === 'multiple' ? 'primary' : 'warning'} size="sm">
                {q.type === 'single' ? 'Один ответ' : q.type === 'multiple' ? 'Несколько ответов' : 'Текстовый'}
              </Badge>
              <span className={styles.questionPts}>{q.points} б.</span>
            </div>
            <h3 className={styles.questionText}>{q.text}</h3>

            {q.type === 'single' && (
              <div className={styles.optionsList}>
                {q.options.map(opt => {
                  const isSelected = answers[q.id] === opt.id;
                  const showCorrect = isFinished && opt.isCorrect;
                  const showWrong = isFinished && isSelected && !opt.isCorrect;
                  return (
                    <label
                      key={opt.id}
                      className={`${styles.optionLabel} ${isSelected ? styles.optionSelected : ''} ${showCorrect ? styles.optionCorrect : ''} ${showWrong ? styles.optionWrong : ''}`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={isSelected}
                        onChange={() => handleSingleAnswer(q.id, opt.id)}
                        disabled={isFinished}
                        className={styles.hiddenInput}
                      />
                      <span className={styles.optionRadio}>
                        {isSelected && <span className={styles.optionRadioDot} />}
                      </span>
                      <span className={styles.optionText}>{opt.text}</span>
                      {showCorrect && <span className={styles.correctMark}>✓</span>}
                      {showWrong && <span className={styles.wrongMark}>✕</span>}
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'multiple' && (
              <div className={styles.optionsList}>
                {q.options.map(opt => {
                  const selected = ((answers[q.id] as string[]) || []);
                  const isSelected = selected.includes(opt.id);
                  const showCorrect = isFinished && opt.isCorrect;
                  const showWrong = isFinished && isSelected && !opt.isCorrect;
                  return (
                    <label
                      key={opt.id}
                      className={`${styles.optionLabel} ${isSelected ? styles.optionSelected : ''} ${showCorrect ? styles.optionCorrect : ''} ${showWrong ? styles.optionWrong : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMultipleAnswer(q.id, opt.id)}
                        disabled={isFinished}
                        className={styles.hiddenInput}
                      />
                      <span className={styles.optionCheckbox}>
                        {isSelected && <span className={styles.optionCheckIcon}>✓</span>}
                      </span>
                      <span className={styles.optionText}>{opt.text}</span>
                      {showCorrect && <span className={styles.correctMark}>✓</span>}
                      {showWrong && <span className={styles.wrongMark}>✕</span>}
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === 'text' && (
              <textarea
                className={styles.textAnswer}
                placeholder="Введите ваш ответ..."
                value={(answers[q.id] as string) || ''}
                onChange={e => handleTextAnswer(q.id, e.target.value)}
                disabled={isFinished}
                rows={3}
              />
            )}
          </Card>
        ))}
      </div>

      {/* Submit button */}
      {!isFinished && (
        <div className={styles.submitSection}>
          <Button variant="primary" onClick={handleConfirmSubmit} className={styles.submitBtn}>
            Завершить тест
          </Button>
        </div>
      )}
    </div>
  );
});
