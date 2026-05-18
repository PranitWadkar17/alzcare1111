"use client";

import { useState } from "react";

import MemoryGame from "./components/MemoryGame";
import FocusGame from "./components/FocusGame";
import QuizGame from "./components/QuizGame";

import {
  Brain,
  Puzzle,
  Target,
  Sparkles,
  Trophy,
  Timer,
  Activity,
} from "lucide-react";

export default function MindGamesPage() {

  const [game, setGame] = useState("memory");

  return (
    <div className="min-h-screen bg-[#020617] text-white p-5">

      {/* ================= HEADER ================= */}

      <div className="flex items-center justify-between mb-6">

        <div>

          <div className="flex items-center gap-3 mb-1">

            <Brain className="text-emerald-400" size={32} />

            <h1 className="text-4xl font-black">
              Mind Games
            </h1>

          </div>

          <p className="text-slate-400 text-sm">
            Cognitive memory & focus training
          </p>

        </div>

        <button className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all px-5 py-3 rounded-2xl text-cyan-300 font-semibold">

          Start Training

        </button>

      </div>

      {/* ================= TOP STATS ================= */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-3xl p-5">

          <div className="flex items-center gap-2 mb-3">

            <Trophy className="text-emerald-400" size={20} />

            <span className="text-slate-300 text-sm">
              Brain Score
            </span>

          </div>

          <h1 className="text-3xl font-black text-emerald-400">
            92
          </h1>

        </div>

        <div className="bg-[#071122] border border-white/10 rounded-3xl p-5">

          <div className="flex items-center gap-2 mb-3">

            <Timer className="text-cyan-400" size={20} />

            <span className="text-slate-300 text-sm">
              Training
            </span>

          </div>

          <h1 className="text-3xl font-black text-cyan-400">
            45m
          </h1>

        </div>

        <div className="bg-[#071122] border border-white/10 rounded-3xl p-5">

          <div className="flex items-center gap-2 mb-3">

            <Activity className="text-pink-400" size={20} />

            <span className="text-slate-300 text-sm">
              Focus Level
            </span>

          </div>

          <h1 className="text-3xl font-black text-pink-400">
            High
          </h1>

        </div>

        <div className="bg-[#071122] border border-white/10 rounded-3xl p-5">

          <div className="flex items-center gap-2 mb-3">

            <Brain className="text-yellow-400" size={20} />

            <span className="text-slate-300 text-sm">
              Sessions
            </span>

          </div>

          <h1 className="text-3xl font-black text-yellow-400">
            18
          </h1>

        </div>

      </div>

      {/* ================= GAME MENU ================= */}

      <div className="grid md:grid-cols-3 gap-4 mb-6">

        <button
          onClick={() => setGame("memory")}
          className={`
            rounded-3xl p-5 border transition-all text-left
            ${
              game === "memory"
                ? "bg-emerald-500/15 border-emerald-400"
                : "bg-[#071122] border-white/10 hover:border-emerald-500/40"
            }
          `}
        >

          <Puzzle
            size={30}
            className="text-emerald-400 mb-3"
          />

          <h1 className="text-xl font-bold mb-1">
            Memory Match
          </h1>

          <p className="text-slate-400 text-sm">
            Pattern & recall training
          </p>

        </button>

        <button
          onClick={() => setGame("focus")}
          className={`
            rounded-3xl p-5 border transition-all text-left
            ${
              game === "focus"
                ? "bg-cyan-500/15 border-cyan-400"
                : "bg-[#071122] border-white/10 hover:border-cyan-500/40"
            }
          `}
        >

          <Target
            size={30}
            className="text-cyan-400 mb-3"
          />

          <h1 className="text-xl font-bold mb-1">
            Focus Tap
          </h1>

          <p className="text-slate-400 text-sm">
            Improve concentration speed
          </p>

        </button>

        <button
          onClick={() => setGame("quiz")}
          className={`
            rounded-3xl p-5 border transition-all text-left
            ${
              game === "quiz"
                ? "bg-pink-500/15 border-pink-400"
                : "bg-[#071122] border-white/10 hover:border-pink-500/40"
            }
          `}
        >

          <Sparkles
            size={30}
            className="text-pink-400 mb-3"
          />

          <h1 className="text-xl font-bold mb-1">
            Brain Quiz
          </h1>

          <p className="text-slate-400 text-sm">
            Cognitive awareness test
          </p>

        </button>

      </div>

      {/* ================= MAIN CONTENT ================= */}

      <div className="bg-[#071122] border border-white/10 rounded-[30px] p-5">

        {game === "memory" && <MemoryGame />}

        {game === "focus" && <FocusGame />}

        {game === "quiz" && <QuizGame />}

      </div>

    </div>
  );
}