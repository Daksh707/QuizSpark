// QuizMaster Client-side JavaScript

// Global variables
let socket = null;
let connectionStatus = 'disconnected';

// Initialize Socket.IO connection
function initializeSocket() {
    if (typeof io !== 'undefined') {
        socket = io();
        
        socket.on('connect', () => {
            connectionStatus = 'connected';
            updateConnectionStatus();
            console.log('Connected to server');
        });
        
        socket.on('disconnect', () => {
            connectionStatus = 'disconnected';
            updateConnectionStatus();
            console.log('Disconnected from server');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            connectionStatus = 'disconnected';
            updateConnectionStatus();
        });
        
        // Quiz-specific events
        socket.on('leaderboard-update', (leaderboard) => {
            updateLeaderboard(leaderboard);
        });
        
        socket.on('user-joined', (data) => {
            showNotification(`New participant joined! (${data.participantCount} total)`, 'info');
        });
        
        socket.on('quiz-completed', (data) => {
            showNotification(`Quiz completed! Score: ${data.score}/${data.totalPoints}`, 'success');
        });
    }
}

// Update connection status indicator
function updateConnectionStatus() {
    let indicator = document.getElementById('connection-status');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'connection-status';
        document.body.appendChild(indicator);
    }
    
    if (connectionStatus === 'connected') {
        indicator.className = 'connection-status connected';
        indicator.innerHTML = '<i class="fas fa-wifi"></i> Connected';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
    } else {
        indicator.className = 'connection-status disconnected';
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Disconnected';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'warning' ? 'alert-warning' : 
                      type === 'danger' ? 'alert-danger' : 'alert-info';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.top = '80px';
    notification.style.right = '20px';
    notification.style.zIndex = '1060';
    notification.style.minWidth = '300px';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Quiz timer functionality
function initializeTimer(duration, display) {
    let timer = duration * 60; // Convert to seconds
    const interval = setInterval(() => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        
        display.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        // Change color when time is running out
        if (timer <= 300) { // 5 minutes
            display.parentElement.classList.add('warning');
        }
        
        if (timer <= 0) {
            clearInterval(interval);
            display.textContent = "Time's Up!";
            submitQuiz(true); // Auto-submit when time runs out
        }
        
        timer--;
    }, 1000);
    
    return interval;
}

// Submit quiz functionality
function submitQuiz(timeUp = false) {
    if (timeUp || confirm('Are you sure you want to submit your quiz?')) {
        const form = document.getElementById('quiz-form');
        if (form) {
            // Collect all answers
            const answers = {};
            const formData = new FormData(form);
            
            for (let [key, value] of formData.entries()) {
                if (key.startsWith('question-')) {
                    const questionId = key.replace('question-', '');
                    answers[questionId] = value;
                }
            }
            
            // Add answers to form
            const answersInput = document.createElement('input');
            answersInput.type = 'hidden';
            answersInput.name = 'answers';
            answersInput.value = JSON.stringify(answers);
            form.appendChild(answersInput);
            
            // Emit to socket for real-time updates
            if (socket && socket.connected) {
                const quizId = form.getAttribute('data-quiz-id');
                const userId = form.getAttribute('data-user-id');
                
                if (quizId && userId) {
                    socket.emit('complete-quiz', {
                        quizId,
                        userId,
                        finalScore: calculateScore(answers),
                        totalPoints: getTotalPoints()
                    });
                }
            }
            
            form.submit();
        }
    }
}

// Calculate score for real-time updates
function calculateScore(answers) {
    // This would need access to correct answers - implementation depends on quiz structure
    return 0; // Placeholder
}

// Get total points for the quiz
function getTotalPoints() {
    const pointElements = document.querySelectorAll('[data-points]');
    let total = 0;
    pointElements.forEach(element => {
        total += parseInt(element.getAttribute('data-points')) || 10;
    });
    return total;
}

// Update leaderboard in real-time
function updateLeaderboard(leaderboard) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer) return;
    
    let html = '';
    leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const percentage = entry.total_points > 0 ? Math.round((entry.score / entry.total_points) * 100) : 0;
        const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : 'other';
        
        html += `
            <div class="leaderboard-item card mb-2 fade-in">
                <div class="card-body py-2">
                    <div class="d-flex align-items-center">
                        <div class="leaderboard-rank ${rankClass}">${rank}</div>
                        <div class="flex-grow-1">
                            <div class="fw-bold">${entry.first_name || entry.username}</div>
                            <small class="text-muted">${entry.username}</small>
                        </div>
                        <div class="text-end">
                            <div class="leaderboard-score">${entry.score}/${entry.total_points}</div>
                            <small class="text-muted">${percentage}%</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    leaderboardContainer.innerHTML = html || '<p class="text-center text-muted">No results yet</p>';
}

// Join quiz room for real-time updates
function joinQuizRoom(quizId, userId, userRole) {
    if (socket && socket.connected) {
        socket.emit('join-quiz', { quizId, userId, userRole });
    }
}

// Progress bar update
function updateProgress(current, total) {
    const progressBar = document.getElementById('quiz-progress-bar');
    if (progressBar) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    const counter = document.getElementById('question-counter');
    if (counter) {
        counter.textContent = `Question ${current} of ${total}`;
    }
}

// Auto-save functionality for quiz taking
function initializeAutoSave() {
    const form = document.getElementById('quiz-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[name^="question-"], textarea[name^="question-"], select[name^="question-"]');
    
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            const answer = {
                questionId: input.name.replace('question-', ''),
                answer: input.value
            };
            
            // Save to localStorage as backup
            const quizId = form.getAttribute('data-quiz-id');
            const savedAnswers = JSON.parse(localStorage.getItem(`quiz_${quizId}_answers`) || '{}');
            savedAnswers[answer.questionId] = answer.answer;
            localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(savedAnswers));
            
            // Emit real-time update
            if (socket && socket.connected) {
                const userId = form.getAttribute('data-user-id');
                socket.emit('submit-answer', {
                    quizId,
                    questionId: answer.questionId,
                    answer: answer.answer,
                    userId,
                    score: 0 // Score calculation would be done server-side
                });
            }
        });
    });
}

// Load saved answers from localStorage
function loadSavedAnswers() {
    const form = document.getElementById('quiz-form');
    if (!form) return;
    
    const quizId = form.getAttribute('data-quiz-id');
    const savedAnswers = JSON.parse(localStorage.getItem(`quiz_${quizId}_answers`) || '{}');
    
    Object.keys(savedAnswers).forEach(questionId => {
        const input = form.querySelector(`[name="question-${questionId}"]`);
        if (input) {
            input.value = savedAnswers[questionId];
        }
    });
}

// Clear saved answers when quiz is submitted
function clearSavedAnswers(quizId) {
    localStorage.removeItem(`quiz_${quizId}_answers`);
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('QuizMaster application initialized');
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Initialize auto-save for quiz forms
    initializeAutoSave();
    
    // Load any saved answers
    loadSavedAnswers();
    
    // Handle quiz submission
    const submitButton = document.getElementById('submit-quiz-btn');
    if (submitButton) {
        submitButton.addEventListener('click', () => submitQuiz(false));
    }
    
    // Initialize timer if present
    const timerDisplay = document.getElementById('timer-display');
    const timerDuration = document.getElementById('timer-duration');
    if (timerDisplay && timerDuration) {
        const duration = parseInt(timerDuration.value);
        initializeTimer(duration, timerDisplay);
    }
    
    // Join quiz room if on quiz page
    const quizData = document.getElementById('quiz-data');
    if (quizData) {
        const quizId = quizData.getAttribute('data-quiz-id');
        const userId = quizData.getAttribute('data-user-id');
        const userRole = quizData.getAttribute('data-user-role');
        
        if (quizId && userId && userRole) {
            setTimeout(() => joinQuizRoom(quizId, userId, userRole), 1000);
        }
    }
    
    // Refresh leaderboard periodically
    if (document.getElementById('leaderboard-container')) {
        setInterval(() => {
            const quizId = document.getElementById('leaderboard-container').getAttribute('data-quiz-id');
            if (quizId) {
                fetch(`/api/leaderboard/${quizId}`)
                    .then(response => response.json())
                    .then(data => updateLeaderboard(data))
                    .catch(error => console.error('Error fetching leaderboard:', error));
            }
        }, 5000); // Update every 5 seconds
    }
});

// Handle page visibility changes (pause/resume timer when tab is not active)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page is hidden - pausing updates');
    } else {
        console.log('Page is visible - resuming updates');
    }
});

// Export functions for global access
window.QuizMaster = {
    submitQuiz,
    joinQuizRoom,
    updateProgress,
    showNotification,
    clearSavedAnswers
};