"use client";

import { useEffect, useState } from "react";

import {
  Target,
  Trophy,
  Timer,
} from "lucide-react";

export default function FocusGame() {

  const [target, setTarget] = useState(
    Math.floor(Math.random() * 9)
  );

  const [score, setScore] = useState(0);

  const [time, setTime] = useState(30);

  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {

    if (time <= 0) {
      setGameOver(true);
      return;
    }

    const interval = setInterval(() => {
      setTime((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);

  }, [time]);

  const clickBox = (num: number) => {

    if (gameOver) return;

    if (num === target) {

      setScore((prev) => prev + 10);

      setTarget(Math.floor(Math.random() * 9));

    } else {

      setScore((prev) => Math.max(prev - 5, 0));
    }
  };

  const restart = () => {

    setScore(0);

    setTime(30);

    setGameOver(false);
  };

  return (
    <div>

      <div className="flex justify-between items-center mb-8">

        <div>

          <div className="flex items-center gap-3 mb-2">

            <Target className="text-cyan-400" size={40} />

            <h1 className="text-5xl font-black">
              Focus Tap Pro
            </h1>

          </div>

          <p className="text-slate-400">
            Improve concentration speed
          </p>

        </div>

        <div className="bg-[#0f172a] rounded-3xl p-5">

          <div className="flex items-center gap-2 mb-2">

            <Timer className="text-pink-400" />

            <span className="text-slate-400">
              Time
            </span>

          </div>

          <h1 className="text-4xl font-black text-pink-400">
            {time}s
          </h1>

        </div>

      </div>

      <div className="bg-[#0f172a] rounded-3xl p-6 mb-8 text-center">

        <p className="text-slate-400 mb-2">
          Tap this number
        </p>

        <h1 className="text-7xl font-black text-yellow-400">
          {target}
        </h1>

      </div>

      <div className="grid grid-cols-3 gap-5">

        {[0,1,2,3,4,5,6,7,8].map((num) => (

          <button
            key={num}
            onClick={() => clickBox(num)}
            className="
              h-28 rounded-3xl
              bg-[#0f172a]
              hover:bg-cyan-500
              transition-all
              text-5xl font-black
            "
          >
            {num}
          </button>

        ))}

      </div>

      <div className="mt-8 bg-[#0f172a] rounded-3xl p-6 flex justify-between items-center">

        <div>

          <div className="flex items-center gap-2 mb-2">

            <Trophy className="text-yellow-400" />

            <p className="text-slate-400">
              Score
            </p>

          </div>

          <h1 className="text-5xl font-black text-emerald-400">
            {score}
          </h1>

        </div>

        {gameOver && (

          <button
            onClick={restart}
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-4 rounded-2xl font-bold"
          >
            Restart
          </button>

        )}

      </div>

    </div>
  );
}