document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES DO JOGO ---
    const XP_PER_CORRECT = 10;
    const XP_PENALTY_INCORRECT = 5;
    
    // --- ELEMENTOS DO DOM ---
    // Elementos relacionados ao tema foram removidos, pois o modo claro será desativado.

    const screens = {
        welcome: document.getElementById('welcome-screen'),
        welcomeBack: document.getElementById('welcome-back-screen'),
        menu: document.getElementById('menu-screen'),
        quiz: document.getElementById('quiz-screen'),
        results: document.getElementById('results-screen'),
        review: document.getElementById('review-screen'),
        stats: document.getElementById('stats-screen'),
    };

    const usernameInput = document.getElementById('username-input');
    const startButton = document.getElementById('start-button');
    const continueButton = document.getElementById('continue-button');
    const restartButton = document.getElementById('restart-button');
    
    const welcomeBackUsername = document.getElementById('welcome-back-username');
    const usernameDisplay = document.getElementById('username-display');
    const changeUserButton = document.getElementById('change-user-button');
    const menuButtons = document.querySelectorAll('.menu-button');
    const statsButton = document.getElementById('stats-button');

    // UI de Nível e XP
    const levelDisplay = document.getElementById('level-display');
    const xpDisplay = document.getElementById('xp-display');
    const xpToNextLevelDisplay = document.getElementById('xp-to-next-level-display');
    const xpBar = document.getElementById('xp-bar');

    // Elementos do Quiz
    const exitQuizButton = document.getElementById('exit-quiz-button');
    const quizSubject = document.getElementById('quiz-subject');
    const quizDifficulty = document.getElementById('quiz-difficulty');
    const timerEl = document.getElementById('timer');
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image'); 
    const optionsContainer = document.getElementById('options-container');
    const progressBar = document.getElementById('progress-bar');

    // Elementos de Resultados
    const resultMessage = document.getElementById('result-message');
    const finalScore = document.getElementById('final-score');
    const correctAnswers = document.getElementById('correct-answers');
    const totalQuestionsEl = document.getElementById('total-questions');
    const reviewErrorsButton = document.getElementById('review-errors-button');
    const backToMenuButton = document.getElementById('back-to-menu-button');
    
    // Elementos de Revisão e Estatísticas
    const reviewContent = document.getElementById('review-content');
    const backToResultsButton = document.getElementById('back-to-results-button');
    const backToMenuFromStats = document.getElementById('back-to-menu-from-stats');
    const statsTotalSimulados = document.getElementById('stats-total-simulados');
    const statsAvgGeral = document.getElementById('stats-avg-geral');
    const statsMostMissed = document.getElementById('stats-most-missed');
    let statsChartSubject, statsChartDifficulty;

    // --- VARIÁVEIS DE ESTADO DO JOGO ---
    let allQuestions = [];
    let subjects = [];
    let state = {};

    function getInitialState() {
        return {
            currentUser: '',
            level: 1,
            xp: 0,
            answeredQuestions: [],
            activeQuiz: null,
            quizHistory: [],
        };
    }

    // --- FUNÇÕES PRINCIPAIS DE LÓGICA ---

    async function loadQuestions() {
        try {
            const response = await fetch('./perguntas.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const questionsFromJson = await response.json();

            allQuestions = questionsFromJson.map((q, index) => {
                const answerIndex = q.alternativas.indexOf(q.resposta);
                return {
                    id: index,
                    pergunta: q.pergunta,
                    alternativas: q.alternativas,
                    image: q.image || null, 
                    answer: answerIndex,
                    difficulty: q.nivel || 'médio',
                    subject: q.disciplina,
                    explanation: q.explicacao
                };
            });

            subjects = [...new Set(allQuestions.map(q => q.subject))];
            updateSubjectCounts();
        } catch (error) {
            console.error("Não foi possível carregar as perguntas:", error);
            document.getElementById('app').innerHTML = '<div class="text-center p-8 bg-red-100 text-red-700">Erro fatal: Não foi possível carregar o arquivo de perguntas.</div>';
        }
    }

    function updateSubjectCounts() {
        const countPort = document.getElementById('count-portugues');
        if (countPort) countPort.textContent = allQuestions.filter(q => q.subject === 'Português').length;
        
        const countMat = document.getElementById('count-matematica');
        if (countMat) countMat.textContent = allQuestions.filter(q => q.subject === 'Matemática').length;
        
        const countRaciocinio = document.getElementById('count-raciocinio');
        if (countRaciocinio) countRaciocinio.textContent = allQuestions.filter(q => q.subject === 'Raciocínio Lógico').length;
        
        const countMisto = document.getElementById('count-misto');
        if (countMisto) countMisto.textContent = allQuestions.length;
    }

    function loadState() {
        const savedState = localStorage.getItem('quizAppState');
        if (savedState) {
            state = JSON.parse(savedState);
            welcomeBackUsername.textContent = state.currentUser;
            showScreen('welcomeBack');
        } else {
            state = getInitialState();
            showScreen('welcome');
        }
        // updateTheme(); // Chamada removida, pois o tema claro será desativado.
    }

    function saveState() {
        localStorage.setItem('quizAppState', JSON.stringify(state));
    }

    function resetState() {
        const username = state.currentUser;
        state = getInitialState();
        state.currentUser = username;
        saveState();
        goToMenu();
    }

    function goToMenu() {
        usernameDisplay.textContent = state.currentUser;
        updateLevelUI();
        showScreen('menu');
        updateSubjectCounts(); 
    }

    function startQuiz(mode) {
        let availableQuestions = allQuestions.filter(q => !state.answeredQuestions.includes(q.id));

        if (mode !== 'Misto') {
            availableQuestions = availableQuestions.filter(q => q.subject === mode);
        }

        if (availableQuestions.length === 0) {
            showModal(`Parabéns! Você respondeu todas as questões de "${mode}". Para jogar novamente, comece um novo jogo.`);
            return;
        }

        const shuffledQuestions = availableQuestions.sort(() => 0.5 - Math.random());
        
        state.activeQuiz = {
            mode: mode,
            questions: shuffledQuestions,
            currentQuestionIndex: 0,
            score: 0,
            userAnswers: [],
        };
        
        saveState();
        showScreen('quiz');
        displayQuestion();
    }

    function displayQuestion() {
        const quiz = state.activeQuiz;
        if (!quiz || quiz.currentQuestionIndex >= quiz.questions.length) {
            endQuiz();
            return;
        }

        const q = quiz.questions[quiz.currentQuestionIndex];
        quizSubject.textContent = q.subject;
        quizDifficulty.textContent = q.difficulty;
        
        quizDifficulty.className = 'difficulty-badge mt-1';
        let difficultyClass = q.difficulty.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        quizDifficulty.classList.add(`bg-${difficultyClass}`);

        questionText.textContent = q.pergunta;
        
        if (q.image) {
            questionImage.src = q.image;
            questionImage.classList.remove('hidden');
        } else {
            questionImage.src = '';
            questionImage.classList.add('hidden');
        }

        optionsContainer.innerHTML = '';
        q.alternativas.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = "option-button w-full text-left p-4 rounded-lg border-2 border-transparent transition-all focus:outline-none focus:ring-2 focus:ring-orange-500";
            button.innerHTML = `<span class="font-bold mr-3 text-orange-500">${String.fromCharCode(65 + index)}</span> ${option}`;
            button.onclick = () => selectAnswer(index, button);
            optionsContainer.appendChild(button);
        });

        updateProgressBar();
        startTimer();
    }
    
    function startTimer() {
        clearInterval(state.timerInterval);
        state.timeLeft = 180;
        timerEl.textContent = '3:00';
        timerEl.parentElement.classList.remove('text-yellow-500', 'text-red-500');

        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            const minutes = Math.floor(state.timeLeft / 60);
            const seconds = state.timeLeft % 60;
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (state.timeLeft <= 30) timerEl.parentElement.classList.add('text-yellow-500');
            if (state.timeLeft <= 10) timerEl.parentElement.classList.add('text-red-500');

            if (state.timeLeft <= 0) selectAnswer(-1, null);
        }, 1000);
    }

    function selectAnswer(selectedIndex, button) {
        clearInterval(state.timerInterval);
        const quiz = state.activeQuiz;
        const q = quiz.questions[quiz.currentQuestionIndex];
        const isCorrect = selectedIndex === q.answer;

        if (isCorrect) {
            quiz.score++;
            if (button) button.classList.add('correct');
        } else {
            if (button) button.classList.add('incorrect');
            if (q.answer >= 0 && optionsContainer.children[q.answer]) {
                optionsContainer.children[q.answer].classList.add('correct');
            }
        }
        
        updateXp(isCorrect);
        state.answeredQuestions.push(q.id);

        quiz.userAnswers.push({
            questionId: q.id,
            isCorrect: isCorrect,
            selectedAnswerIndex: selectedIndex
        });

        Array.from(optionsContainer.children).forEach(btn => btn.disabled = true);
        
        const explanationEl = document.createElement('div');
        explanationEl.className = 'mt-6 p-4 rounded-lg bg-blue-500/10 border-l-4 border-blue-500 fade-in';
        explanationEl.innerHTML = `<p class="font-bold text-blue-800 dark:text-blue-300">Gabarito:</p><p class="mt-1 text-gray-700 dark:text-gray-300">${q.explanation || 'Explicação não disponível.'}</p>`;
        
        const nextButton = document.createElement('button');
        nextButton.innerHTML = 'Avançar ❯';
        nextButton.className = 'w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all';
        nextButton.onclick = () => {
            quiz.currentQuestionIndex++;
            saveState();
            displayQuestion();
        };
        
        optionsContainer.appendChild(explanationEl);
        optionsContainer.appendChild(nextButton);
    }

    function endQuiz() {
        const quiz = state.activeQuiz;
        if (!quiz) return;

        state.quizHistory.push({
            date: new Date().toISOString(),
            mode: quiz.mode,
            score: quiz.score,
            totalQuestions: quiz.questions.length,
            answers: quiz.userAnswers,
        });

        finalScore.textContent = `${quiz.score}/${quiz.questions.length}`;
        correctAnswers.textContent = quiz.score;
        totalQuestionsEl.textContent = quiz.questions.length;
        
        const performance = quiz.questions.length > 0 ? (quiz.score / quiz.questions.length) : 0;
        if (performance >= 0.8) resultMessage.textContent = "Excelente! Você está no caminho certo para a aprovação!";
        else if (performance >= 0.5) resultMessage.textContent = "Bom trabalho! Continue praticando para dominar todos os tópicos.";
        else resultMessage.textContent = "Não desanime! Cada erro é uma oportunidade de aprender. Vamos revisar!";

        reviewErrorsButton.style.display = 'block';

        state.activeQuiz = null;
        saveState();
        showScreen('results');
    }

    // --- LÓGICA DE NÍVEL E XP ---
    function getXpForNextLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    function updateXp(isCorrect) {
        if (isCorrect) {
            state.xp += XP_PER_CORRECT;
        } else {
            state.xp = Math.max(0, state.xp - XP_PENALTY_INCORRECT);
        }
        checkLevelUp();
        updateLevelUI();
    }

    function checkLevelUp() {
        const xpNeeded = getXpForNextLevel(state.level);
        if (state.xp >= xpNeeded) {
            state.level++;
            state.xp = state.xp - xpNeeded;
            showModal(`Parabéns! Você subiu para o Nível ${state.level}!`);
        }
    }

    function updateLevelUI() {
        const xpNeeded = getXpForNextLevel(state.level);
        levelDisplay.textContent = state.level;
        xpDisplay.textContent = state.xp;
        xpToNextLevelDisplay.textContent = xpNeeded;
        xpBar.style.width = `${Math.min(100, (state.xp / xpNeeded) * 100)}%`;
    }

    function updateProgressBar() {
        const quiz = state.activeQuiz;
        if (!quiz) return;
        const progress = (quiz.currentQuestionIndex / quiz.questions.length) * 100;
        progressBar.style.width = `${progress}%`;

        progressBar.classList.remove('bg-red-500', 'bg-yellow-500', 'bg-green-500');
        if (progress < 40) {
            progressBar.classList.add('bg-red-500');
        } else if (progress < 80) {
            progressBar.classList.add('bg-yellow-500');
        } else {
            progressBar.classList.add('bg-green-500');
        }
    }

    // --- TELAS DE REVISÃO E ESTATÍSTICAS ---
    function showReview() {
        const lastQuiz = state.quizHistory[state.quizHistory.length - 1];
        if (!lastQuiz) return;
        
        reviewContent.innerHTML = '';
        
        lastQuiz.answers.forEach(userAnswer => {
            const q = allQuestions.find(question => question.id === userAnswer.questionId);
            if (!q) return; 

            const correctAnswerIndex = q.answer;
            const selectedAnswerIndex = userAnswer.selectedAnswerIndex;

            let optionsHtml = '';
            q.alternativas.forEach((option, i) => {
                let optionClass = 'border-slate-300 dark:border-slate-600';
                if (i === correctAnswerIndex) {
                    optionClass = 'review-option correct';
                } else if (i === selectedAnswerIndex) {
                    optionClass = 'review-option incorrect';
                }
                optionsHtml += `<li class="p-3 border rounded-lg ${optionClass}">${String.fromCharCode(65 + i)}. ${option}</li>`;
            });

            reviewContent.innerHTML += `
                <div class="p-6 card">
                    <p class="font-bold mb-4">${q.pergunta}</p>
                    ${q.image ? `<img src="${q.image}" alt="Ilustração da questão" class="max-w-full h-auto rounded-lg shadow-md mb-4">` : ''}
                    <ul class="space-y-2">${optionsHtml}</ul>
                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p class="font-semibold">Gabarito:</p>
                        <p class="text-sm text-slate-600 dark:text-slate-400">${q.explanation || 'Explicação não disponível.'}</p>`;
        });

        showScreen('review');
    }

    function showStats() {
        const history = state.quizHistory;
        statsTotalSimulados.textContent = history.length;

        if (history.length === 0) {
            statsAvgGeral.textContent = 'N/A';
            statsMostMissed.innerHTML = '<p class="text-center text-slate-500">Nenhum simulado realizado ainda.</p>';
            if (statsChartSubject) statsChartSubject.destroy();
            if (statsChartDifficulty) statsChartDifficulty.destroy();
            showScreen('stats');
            return;
        }

        const allAnswers = history.flatMap(h => {
            return h.answers.map(ans => {
                const question = allQuestions.find(q => q.id === ans.questionId);
                return { ...ans, subject: question.subject, difficulty: question.difficulty, questionText: question.pergunta };
            });
        });
        
        const totalCorrect = allAnswers.filter(a => a.isCorrect).length;
        statsAvgGeral.textContent = allAnswers.length > 0 ? `${((totalCorrect / allAnswers.length) * 100).toFixed(0)}%` : '0%';

        const subjectData = {};
        subjects.forEach(s => subjectData[s] = { correct: 0, total: 0 });
        allAnswers.forEach(a => {
            if(subjectData[a.subject]) {
                subjectData[a.subject].total++;
                if (a.isCorrect) subjectData[a.subject].correct++;
            }
        });
        const subjectLabels = Object.keys(subjectData);
        const subjectPercentages = subjectLabels.map(s => (subjectData[s].total > 0 ? (subjectData[s].correct / subjectData[s].total) * 100 : 0));

        if (statsChartSubject) statsChartSubject.destroy();
        statsChartSubject = new Chart(document.getElementById('stats-chart-subject'), {
            type: 'bar',
            data: { labels: subjectLabels, datasets: [{ label: '% de Acertos', data: subjectPercentages, backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'] }] },
            options: { scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
        });

        const difficultyData = { 'fácil': {correct:0, total:0}, 'médio': {correct:0, total:0}, 'difícil': {correct:0, total:0} };
        allAnswers.forEach(a => {
            if(difficultyData[a.difficulty]) {
                difficultyData[a.difficulty].total++;
                if (a.isCorrect) difficultyData[a.difficulty].correct++;
            }
        });
        const difficultyLabels = Object.keys(difficultyData);
        const difficultyPercentages = difficultyLabels.map(d => (difficultyData[d].total > 0 ? (difficultyData[d].correct / difficultyData[d].total) * 100 : 0));
        
        if (statsChartDifficulty) statsChartDifficulty.destroy();
        statsChartDifficulty = new Chart(document.getElementById('stats-chart-difficulty'), {
            type: 'doughnut',
            data: { labels: difficultyLabels, datasets: [{ data: difficultyPercentages, backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
        
        const missedCount = {};
        allAnswers.filter(a => !a.isCorrect).forEach(a => missedCount[a.questionText] = (missedCount[a.questionText] || 0) + 1);
        const sortedMissed = Object.entries(missedCount).sort((a, b) => b[1] - a[1]);
        statsMostMissed.innerHTML = '';
        if (sortedMissed.length > 0) {
            sortedMissed.slice(0, 5).forEach(([question, count]) => statsMostMissed.innerHTML += `<p class="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm">"${question}" (errou ${count}x)</p>`);
        } else {
            statsMostMissed.innerHTML = '<p class="text-center text-slate-500">Você não errou nenhuma questão até agora. Parabéns!</p>';
        }

        showScreen('stats');
    }

    // --- FUNÇÕES AUXILIARES E DE UI ---
    function showModal(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50';
        
        let buttonsHtml = `<button class="modal-ok-button bg-orange-500 text-white font-bold py-2 px-4 rounded-lg">OK</button>`;
        if (onConfirm) {
            buttonsHtml = `
                <button class="modal-cancel-button bg-gray-300 dark:bg-gray-600 text-black dark:text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button class="modal-ok-button bg-red-500 text-white font-bold py-2 px-4 rounded-lg">Confirmar</button>
            `;
        }

        modal.innerHTML = `<div class="card p-6 rounded-lg shadow-xl text-center max-w-sm fade-in">
                                    <p class="mb-4">${message}</p>
                                    <div class="flex justify-center gap-4">${buttonsHtml}</div>
                                   </div>`;

        modal.querySelector('.modal-ok-button').onclick = () => {
            if(onConfirm) onConfirm();
            document.body.removeChild(modal);
        };

        if(onConfirm) {
             modal.querySelector('.modal-cancel-button').onclick = () => {
                document.body.removeChild(modal);
            };
        }
        
        document.body.appendChild(modal);
    }

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        if (screens[screenName]) {
            screens[screenName].classList.remove('hidden');
            screens[screenName].classList.add('fade-in');
        }
    }

    // A função updateTheme foi removida, pois o tema claro será desativado.
    // function updateTheme() {
    //     const savedTheme = localStorage.getItem('theme');
    //     if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    //         document.documentElement.classList.add('dark');
    //         themeIconDark.classList.remove('hidden');
    //         themeIconLight.classList.add('hidden');
    //     } else {
    //         document.documentElement.classList.remove('dark');
    //         themeIconLight.classList.remove('hidden');
    //         themeIconDark.classList.add('hidden');
    //     }
    // }
    
    // --- EVENT LISTENERS ---
    
    startButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            state.currentUser = username;
            saveState();
            goToMenu();
        } else {
            showModal('Por favor, insira seu nome para começar.');
        }
    });

    continueButton.addEventListener('click', () => {
        if (state.activeQuiz) {
            showScreen('quiz');
            displayQuestion();
        } else {
            goToMenu();
        }
    });

    restartButton.addEventListener('click', () => {
        showModal('Tem certeza que deseja começar um novo jogo? Todo o seu progresso (nível, XP e questões respondidas) será apagado.', () => {
            resetState();
        });
    });

    changeUserButton.addEventListener('click', () => {
        showModal('Tem certeza que deseja trocar de usuário? O progresso atual será perdido.', () => {
            localStorage.removeItem('quizAppState');
            loadState();
        });
    });

    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            startQuiz(mode);
        });
    });

    exitQuizButton.addEventListener('click', () => {
        goToMenu();
    });

    backToMenuButton.addEventListener('click', goToMenu);
    backToResultsButton.addEventListener('click', () => showScreen('results'));
    statsButton.addEventListener('click', showStats);
    backToMenuFromStats.addEventListener('click', goToMenu);
    reviewErrorsButton.addEventListener('click', showReview);

    // O event listener para o themeToggle foi removido, pois o modo claro será desativado.
    // themeToggle.addEventListener('click', () => {
    //     document.documentElement.classList.toggle('dark');
    //     localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    //     updateTheme();
    // });

    // --- INICIALIZAÇÃO ---
    function initializeApp() {
        loadQuestions();
        loadState();
    }

    initializeApp();
});
