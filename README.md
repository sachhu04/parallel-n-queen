# Parallel N-Queens Demonstration ♛

A sleek, highly interactive, and visually stunning web-based demonstration of the parallelized N-Queens problem. This project serves as a frontend visualization tool to conceptualize how a multithreaded environment (like C++ OpenMP) approaches backtracking algorithms by delegating tasks.

## 🚀 Features

- **Algorithmic Visualization:** Watch multiple threads compute safe queen placements simultaneously.
- **Glassmorphic UI Design:** A premium, modern UI featuring sleek gradients, smooth transitions, and translucent panels.
- **Thread Emulation:** Simulates a 4-thread pool solving the N-Queens problem with parallel backtracking execution.
- **Dynamic Board Sizing:** Adjustable board sizes (from `N=1` to `N=12`), seamlessly recalculating task loads and updating the grid.
- **Live Status Logging:** Real-time terminal-like feedback showing backtracking events, thread completions, and found solutions.

## 🛠 Tech Stack

- **HTML5:** Semantic architecture.
- **Tailwind CSS:** Fully responsive, utility-first styling with custom configurations.
- **Vanilla JavaScript:** Robust, dependency-free logic handling asynchronous thread emulation and algorithmic computations.

## 📂 Project Structure

```text
├── index.html        # Main entry point and UI layout
├── css/
│   └── style.css     # Custom animations, glassmorphism, and scrollbar styles
└── js/
    └── script.js     # N-Queens backtracking algorithm and thread simulation logic
```

## 🧠 How it Works

The N-Queens problem asks how to place $N$ non-attacking queens on an $N \times N$ chessboard.

To emulate OpenMP's `#pragma omp parallel for`:
1. The algorithm partitions the initial workload based on the first row's column placements.
2. It spins up "threads" (simulated via asynchronous intervals) that process these tasks independently.
3. Each thread utilizes depth-first search (DFS) combined with backtracking.
4. As safe spots are calculated, the UI continuously updates the chessboard and local status log until all partial solutions are verified.

## ⚡ Getting Started

Simply open `index.html` in any modern web browser to start the application. No complex build tools or local servers are strictly required.

```bash
# Clone the repository
git clone https://github.com/sachhu04/parallel-n-queen.git

# Navigate into the project directory
cd parallel-n-queen

# Open the visualization
open index.html
```

## 👨‍💻 Authors

- **Sachin Singh** ([@sachhu04](https://github.com/sachhu04))