// --- Global Variables ---
let globalN = 4;
let tasks = [];
let stepCounters = [];
let tasksDone = [];
let simulationInterval;
let totalSolutions = 0;
let startTime = 0;

// --- New state for 4-thread pool simulation ---
const NUM_THREADS = 4;
let threadState = []; 
let nextTaskIndex = 0;
let tasksDoneCount = 0;

// --- Element References ---
const threadGrid = document.getElementById('thread-grid');
const startBtn = document.getElementById('start-btn');
const mainLog = document.getElementById('main-log');
const mainLogContainer = document.getElementById('main-log-container');
const totalSolutionsEl = document.getElementById('total-solutions');
const execTimeEl = document.getElementById('exec-time');
const setNBtn = document.getElementById('set-n-btn');
const nInput = document.getElementById('n-input');
const simulationWrapper = document.getElementById('simulation-wrapper');

const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// --- Modal Logic ---
let modalConfirmCallback = null;

function showModal(message, showCancel = false, onConfirm = null) {
    modalMessage.textContent = message;
    modalConfirmCallback = onConfirm;
    
    modalCancelBtn.style.display = showCancel ? 'block' : 'none';
    
    modalBackdrop.classList.remove('hidden');
    // Trigger reflow
    void modalBackdrop.offsetWidth;
    
    modalBackdrop.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
}

function hideModal() {
    modalBackdrop.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modalBackdrop.classList.add('hidden');
    }, 300);
}

modalConfirmBtn.addEventListener('click', () => {
    hideModal();
    if (modalConfirmCallback) {
        modalConfirmCallback();
    }
});

modalCancelBtn.addEventListener('click', () => {
    hideModal();
});

// --- N-Queens Algorithm ---

function isSafe(row, col, board) {
    for (let i = 0; i < row; i++) {
        if (board[i] === col || Math.abs(board[i] - col) === (row - i)) {
            return false;
        }
    }
    return true;
}

function generateStepsForTask(N, startCol) {
    const steps = [];
    let board = new Array(N).fill(-1);
    
    function solve(row, currentBoard) {
        if (row === N) {
            steps.push({ board: [...currentBoard], msg: "SOLUTION FOUND!", solution: true });
            return 1; 
        }

        let solutionCount = 0;
        let placedAQueen = false;

        for (let col = 0; col < N; col++) {
            if (isSafe(row, col, currentBoard)) {
                placedAQueen = true;
                currentBoard[row] = col;
                steps.push({ board: [...currentBoard], msg: `Row ${row}: Try (${row}, ${col}). OK.` });
                
                solutionCount += solve(row + 1, currentBoard);
                
                currentBoard[row] = -1;
                if(row < N) {
                     steps.push({ board: [...currentBoard], msg: `Row ${row+1}: Backtracking...` , backtrack: true});
                }
            }
        }
        
        if (!placedAQueen) {
             steps.push({ board: [...currentBoard], msg: `Row ${row}: No safe spots. Backtrack.` });
        }

        return solutionCount;
    }
    
    let solutionsFound = 0;
    if (isSafe(0, startCol, board)) {
        board[0] = startCol; 
        steps.push({ board: [...board], msg: `Start: Queen at (0, ${startCol})` });
        solutionsFound = solve(1, board); 
    } else {
        steps.push({ board: [...board], msg: `Start: (0, ${startCol}) is not safe.` });
    }

    board.fill(-1);
    steps.push({ board: [...board], msg: `Task Complete. Found ${solutionsFound} solution(s).`, final: true, solutions: solutionsFound });
    
    return steps;
}

function initializeSimulation(N) {
    globalN = N;
    tasks = []; 
    
    document.querySelector('header p').textContent = `Visualizing Threaded Execution for N = ${N}`;
    
    const introText = document.getElementById('intro-text');
    introText.innerHTML = `This simulation demonstrates how your C++ OpenMP code parallelizes the N-Queens problem. For N=${N}, the main loop <code class="font-mono text-sm bg-slate-800 text-pink-400 px-2 py-1 rounded-md border border-slate-700">#pragma omp parallel for</code> divides the work into ${N} initial tasks:`;
    
    const introList = document.getElementById('intro-list');
    introList.innerHTML = '';
    
    // Group intro items nicely
    for (let i = 0; i < N; i++) {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50';
        li.innerHTML = `
            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-amber-400 font-bold text-sm shadow-inner">${i+1}</span>
            <span class="text-slate-300">Find all solutions starting with a queen at <code class="font-mono text-sm text-accent bg-slate-900 px-1.5 py-0.5 rounded">(0, ${i})</code></span>
        `;
        introList.appendChild(li);
    }

    for (let i = 0; i < N; i++) {
        tasks.push({
            startCol: i,
            threadId: i,
            steps: generateStepsForTask(N, i)
        });
    }
}

// --- UI Functions ---

function renderBoard(boardArray, boardElement) {
    boardElement.innerHTML = ''; 
    const N = boardArray.length; 
    
    let fontSize = "2.25rem"; 
    if (N > 6) fontSize = "1.5rem"; 
    if (N > 8) fontSize = "1.125rem"; 

    // Update grid columns dynamically if needed (done via inline style for safety since Tailwind might purge dynamic classes)
    boardElement.style.gridTemplateColumns = `repeat(${N}, minmax(0, 1fr))`;

    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const square = document.createElement('div');
            square.className = 'square';
            const squareContent = document.createElement('div');
            squareContent.className = 'square-content';
            squareContent.style.fontSize = fontSize; 
            
            const isDark = (r + c) % 2 === 1;
            squareContent.classList.add(isDark ? 'square-dark' : 'square-light');

            if (boardArray[r] === c) {
                const queenSpan = document.createElement('span');
                queenSpan.textContent = '♛'; 
                queenSpan.className = `queen-piece ${isDark ? 'text-slate-900' : 'text-slate-900'}`;
                // Adding a slight glow for better visibility
                if(isDark) {
                    queenSpan.style.color = '#0f172a';
                    queenSpan.style.textShadow = '0 0 4px rgba(255,255,255,0.4)';
                } else {
                    queenSpan.style.color = '#0f172a';
                }
                squareContent.appendChild(queenSpan);
                squareContent.classList.add('square-active');
            }
            square.appendChild(squareContent);
            boardElement.appendChild(square);
        }
    }
}

function setupUI() {
    threadGrid.innerHTML = '';
    mainLog.innerHTML = '';
    totalSolutionsEl.textContent = `Total Solutions: 0`;
    execTimeEl.textContent = 'Execution time: 0.00s';

    threadState = [];
    totalSolutions = 0;
    nextTaskIndex = 0;
    tasksDoneCount = 0;
    if(simulationInterval) clearInterval(simulationInterval);
    
    startBtn.disabled = false;
    startBtn.querySelector('.btn-text').textContent = 'Start Demonstration';
    
    for (let i = 0; i < NUM_THREADS; i++) {
        const card = document.createElement('div');
        card.id = `thread-card-${i}`;
        card.className = 'thread-card bg-cardBg rounded-xl shadow-xl overflow-hidden border border-slate-700 flex flex-col h-full relative';
        
        const header = document.createElement('div');
        header.className = 'p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm';
        header.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-slate-500 status-dot"></div>
                <h3 class="font-bold text-white tracking-wide">Thread <span class="text-accent">${i}</span></h3>
            </div>
            <span class="task-badge bg-slate-700 text-slate-300 task-label">Idle</span>
        `;
        
        const boardWrapper = document.createElement('div');
        boardWrapper.className = 'p-4 flex-grow flex items-center justify-center bg-slate-900/50';
        
        const boardElement = document.createElement('div');
        boardElement.className = `chessboard grid gap-0 w-full max-w-[240px] mx-auto`;
        boardWrapper.appendChild(boardElement);
        
        const statusLog = document.createElement('div');
        statusLog.className = 'status-log h-32 overflow-y-auto bg-slate-900 p-3 font-mono text-xs space-y-1.5 border-t border-slate-700 text-slate-400';
        
        const result = document.createElement('div');
        result.className = 'result p-3 bg-slate-800 text-center font-bold text-slate-400 text-sm tracking-wide border-t border-slate-700 transition-colors duration-300';
        result.innerHTML = '<span class="opacity-70">Waiting to start...</span>';

        card.appendChild(header);
        card.appendChild(boardWrapper);
        card.appendChild(statusLog);
        card.appendChild(result);
        threadGrid.appendChild(card);
        
        renderBoard(new Array(globalN).fill(-1), boardElement);

        threadState.push({
            card: card,
            currentTask: null, 
            stepCounter: 0
        });
    }
}

function resetSimulationState() {
    totalSolutions = 0;
    nextTaskIndex = 0;
    tasksDoneCount = 0;
    if(simulationInterval) clearInterval(simulationInterval);

    mainLog.innerHTML = '';
    totalSolutionsEl.textContent = `Total Solutions: 0`;
    execTimeEl.textContent = 'Execution time: 0.00s';
    startBtn.disabled = false;
    startBtn.querySelector('.btn-text').textContent = 'Start Demonstration';

    for (let i = 0; i < threadState.length; i++) {
        const thread = threadState[i];
        thread.currentTask = null;
        thread.stepCounter = 0;
        
        const card = thread.card;
        const taskLabel = card.querySelector('.task-label');
        taskLabel.textContent = 'Idle';
        taskLabel.className = 'task-badge bg-slate-700 text-slate-300 task-label';
        
        const dot = card.querySelector('.status-dot');
        dot.className = 'w-3 h-3 rounded-full bg-slate-500 status-dot transition-colors';
        
        const resultEl = card.querySelector('.result');
        resultEl.innerHTML = '<span class="opacity-70">Waiting to start...</span>';
        resultEl.className = 'result p-3 bg-slate-800 text-center font-bold text-slate-400 text-sm tracking-wide border-t border-slate-700 transition-colors duration-300';
        
        card.className = 'thread-card bg-cardBg rounded-xl shadow-xl overflow-hidden border border-slate-700 flex flex-col h-full relative';
        card.querySelector('.status-log').innerHTML = '';
        
        renderBoard(new Array(globalN).fill(-1), card.querySelector('.chessboard'));
    }
}

function simulationStep() {
    let allTasksAssigned = (nextTaskIndex === tasks.length);
    
    for (let i = 0; i < NUM_THREADS; i++) {
        const thread = threadState[i];

        if (thread.currentTask === null) {
            if (!allTasksAssigned) {
                const taskIndex = nextTaskIndex++;
                allTasksAssigned = (nextTaskIndex === tasks.length); 
                
                const task = tasks[taskIndex];
                thread.currentTask = task;
                thread.stepCounter = 0;
                
                const card = thread.card;
                const taskLabel = card.querySelector('.task-label');
                taskLabel.textContent = `Col ${task.startCol}`;
                taskLabel.className = 'task-badge bg-accent/20 text-accent task-label';
                
                card.querySelector('.status-dot').classList.replace('bg-slate-500', 'bg-amber-400');
                card.querySelector('.status-dot').classList.add('animate-pulse');
                
                card.querySelector('.status-log').innerHTML = ''; 
                
                const resultEl = card.querySelector('.result');
                resultEl.textContent = 'Computing...';
                resultEl.className = 'result p-3 bg-slate-800 text-center font-bold text-amber-400 text-sm tracking-wide border-t border-slate-700';
                
                card.classList.add('border-accent/50', 'shadow-[0_0_15px_rgba(56,189,248,0.15)]');
            }
            continue; 
        }

        const task = thread.currentTask;
        const stepIndex = thread.stepCounter;

        if (stepIndex >= task.steps.length) {
            thread.currentTask = null;
            continue;
        }

        const step = task.steps[stepIndex];
        
        const card = thread.card;
        const boardEl = card.querySelector('.chessboard');
        const statusEl = card.querySelector('.status-log');
        
        renderBoard(step.board, boardEl);
        
        const logEntry = document.createElement('div');
        logEntry.textContent = `> ${step.msg}`;
        if (step.solution) {
            logEntry.className = 'text-emerald-400 font-bold';
        } else if (step.backtrack || step.msg.includes("Backtrack")) {
            logEntry.className = 'text-rose-400/80';
        } else {
            logEntry.className = 'text-slate-300';
        }
        statusEl.appendChild(logEntry);
        statusEl.scrollTop = statusEl.scrollHeight; 
        
        if (step.final) {
            tasksDoneCount++;
            const resultEl = card.querySelector('.result');
            resultEl.textContent = `Found ${step.solutions} solution(s)`;
            
            card.className = 'thread-card bg-cardBg rounded-xl shadow-xl overflow-hidden border flex flex-col h-full relative transition-all duration-500'; 
            card.querySelector('.status-dot').classList.remove('animate-pulse');
            
            if (step.solutions > 0) {
                resultEl.className = 'result p-3 bg-emerald-900/40 text-center font-bold text-emerald-400 text-sm tracking-wide border-t border-emerald-500/30';
                card.classList.add('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.15)]');
                card.querySelector('.status-dot').className = 'w-3 h-3 rounded-full bg-emerald-500 status-dot';
            } else {
                resultEl.className = 'result p-3 bg-rose-900/30 text-center font-bold text-rose-400 text-sm tracking-wide border-t border-rose-500/30';
                card.classList.add('border-rose-500/30');
                card.querySelector('.status-dot').className = 'w-3 h-3 rounded-full bg-rose-500 status-dot';
            }
            
            const taskLabel = card.querySelector('.task-label');
            taskLabel.textContent = 'Done';
            taskLabel.className = 'task-badge bg-slate-700 text-slate-400 task-label';

            const mainLogEntry = document.createElement('div');
            mainLogEntry.className = 'flex items-start gap-2 py-1 border-b border-slate-800/50 last:border-0 animate-fade-in';
            mainLogEntry.innerHTML = `
                <span class="text-slate-500">[${new Date().toISOString().substring(11, 23)}]</span>
                <span>Thread <span class="text-accent font-bold">${i}</span> finished col <span class="text-amber-400">${task.startCol}</span> &rarr; <span class="${step.solutions > 0 ? 'text-emerald-400' : 'text-slate-400'} font-bold">${step.solutions}</span> solutions.</span>
            `;
            mainLog.appendChild(mainLogEntry);
            mainLogContainer.scrollTop = mainLogContainer.scrollHeight;
            
            totalSolutions += step.solutions;
            totalSolutionsEl.textContent = `Total Solutions: ${totalSolutions}`;
            totalSolutionsEl.classList.add('animate-pulse', 'text-emerald-300');
            setTimeout(() => totalSolutionsEl.classList.remove('animate-pulse', 'text-emerald-300'), 500);

            thread.currentTask = null;
            thread.stepCounter = 0;

        } else {
            thread.stepCounter++;
        }
    }
    
    if (tasksDoneCount === tasks.length) {
        clearInterval(simulationInterval);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        execTimeEl.textContent = `Execution time: ${duration}s`;
        startBtn.disabled = false;
        startBtn.querySelector('.btn-text').textContent = 'Restart Demonstration';
        
        // Final completion log
        const completionLog = document.createElement('div');
        completionLog.className = 'mt-4 pt-2 border-t border-emerald-500/30 text-emerald-400 font-bold animate-fade-in';
        completionLog.textContent = `> Simulation complete. Total solutions found: ${totalSolutions}`;
        mainLog.appendChild(completionLog);
        mainLogContainer.scrollTop = mainLogContainer.scrollHeight;
    }
}

// --- Event Listeners ---

setNBtn.addEventListener('click', () => {
    const nVal = parseInt(nInput.value);
    
    if (isNaN(nVal) || nVal < 1) {
        showModal("Please enter a valid number for N (e.g., 4 or more).");
        return;
    }

    const runSimulationSetup = (n) => {
        if (simulationInterval) {
            clearInterval(simulationInterval);
        }
        
        setNBtn.disabled = true;
        setNBtn.textContent = 'Generating...';
        startBtn.disabled = true;
        
        simulationWrapper.classList.remove('opacity-100');
        simulationWrapper.classList.add('opacity-0');
        
        setTimeout(() => {
            initializeSimulation(n); 
            setupUI(); 
            
            simulationWrapper.classList.remove('hidden'); 
            
            // Allow display:block to take effect before changing opacity
            requestAnimationFrame(() => {
                simulationWrapper.classList.remove('opacity-0');
                simulationWrapper.classList.add('opacity-100');
            });
            
            setNBtn.disabled = false;
            setNBtn.textContent = 'Set N & Initialize';
            startBtn.disabled = false;
        }, 300);
    };
    
    if (nVal > 10) {
         showModal(`N=${nVal} is very large and may take a long time to generate the simulation. Continue?`, true, () => {
             runSimulationSetup(nVal); 
         });
    } else {
        runSimulationSetup(nVal); 
    }
});

startBtn.addEventListener('click', () => {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    resetSimulationState();
    
    startBtn.disabled = true;
    startBtn.querySelector('.btn-text').textContent = 'Running...';
    startTime = performance.now();
    simulationInterval = setInterval(simulationStep, 400); // slightly faster animation
});

// --- Initial Page Load ---
window.addEventListener('DOMContentLoaded', () => {
    initializeSimulation(4);
    setupUI(); 
    simulationWrapper.classList.remove('hidden'); 
    setTimeout(() => {
        simulationWrapper.classList.remove('opacity-0');
        simulationWrapper.classList.add('opacity-100');
    }, 100);
});
