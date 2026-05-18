"use client";

import { useState } from "react";

import {
  Brain,
  Trophy,
} from "lucide-react";

import { quizLevels } from "../data/quizLevels";

export default function QuizGame() {

  const [current, setCurrent] = useState(0);

  const [score, setScore] = useState(0);

  const [completed, setCompleted] = useState(false);

  const currentQuestion = quizLevels[current];

  const answerQuestion = (option: string) => {

    if (option === currentQuestion.answer) {

      setScore((prev) => prev + 10);

    }

    if (current < quizLevels.length - 1) {

      setCurrent((prev) => prev + 1);

    } else {

      setCompleted(true);
    }
  };

  const restart = () => {

    setCurrent(0);

    setScore(0);

    setCompleted(false);
  };

  if (completed) {

    return (

      <div className="bg-[#0f172a] rounded-3xl p-10 text-center">

        <Trophy
          className="mx-auto text-yellow-400 mb-5"
          size={70}
        />

        <h1 className="text-5xl font-black mb-4">
          Quiz Completed
        </h1>

        <p className="text-slate-400 text-xl mb-8">
          Final Score: {score}
        </p>

        <button
          onClick={restart}
          className="bg-pink-500 hover:bg-pink-600 px-6 py-4 rounded-2xl font-bold"
        >
          Restart Quiz
        </button>

      </div>
    );
  }

  return (
    <div>

      <div className="flex items-center gap-3 mb-8">

        <Brain className="text-pink-400" size={40} />

        <div>

          <h1 className="text-5xl font-black">
            Brain Quiz Pro
          </h1>

          <p className="text-slate-400">
            Cognitive awareness challenge
          </p>

        </div>

      </div>

      <div className="bg-[#0f172a] rounded-3xl p-8">

        <div className="mb-8">

          <p className="text-pink-400 font-bold mb-3">
            Question {current + 1}
          </p>

          <h1 className="text-4xl font-black">
            {currentQuestion.question}
          </h1>

        </div>

        <div className="grid gap-5">

          {currentQuestion.options.map((option) => (

            <button
              key={option}
              onClick={() => answerQuestion(option)}
              className="
                bg-pink-500 hover:bg-pink-600
                transition-all
                px-6 py-5
                rounded-2xl
                text-left
                text-xl
                font-semibold
              "
            >
              {option}
            </button>

          ))}

        </div>

        <div className="mt-8 bg-[#111827] rounded-2xl p-5">

          <p className="text-slate-400 mb-2">
            Score
          </p>

          <h1 className="text-5xl font-black text-emerald-400">
            {score}
          </h1>

        </div>

      </div>

    </div>
  );
}