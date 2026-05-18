"use client";

import { useEffect, useState } from "react";

import {
  Trophy,
  RotateCcw,
  Brain,
  Lock,
} from "lucide-react";

import { memoryLevels } from "../data/memoryLevels";

const symbols = [
  "🧠","❤️","💊","🚶","📞","🏥","🍎","⭐",
  "🎵","🚗","🌙","☀️","📚","🧩","🎯","⚡",
  "🐶","🍀","🌸","🎮","🪴","🏆"
];

function shuffle(array: any[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function MemoryGame() {

  const [level, setLevel] = useState(1);

  const [cards, setCards] = useState<any[]>([]);

  const [selected, setSelected] = useState<any[]>([]);

  const [moves, setMoves] = useState(0);

  const [matches, setMatches] = useState(0);

  const [score, setScore] = useState(0);

  const [completed, setCompleted] = useState(false);

  /* LOAD LEVEL */

  useEffect(() => {

    const levelData = memoryLevels[level - 1];

    const pairCount = levelData.pairs;

    const selectedSymbols = symbols.slice(0, pairCount);

    const gameCards = shuffle(
      [...selectedSymbols, ...selectedSymbols].map(
        (symbol, index) => ({
          id: index,
          symbol,
          flipped: false,
          matched: false,
        })
      )
    );

    setCards(gameCards);

    setMatches(0);

    setMoves(0);

    setCompleted(false);

  }, [level]);

  /* MATCH LOGIC */

  useEffect(() => {

    if (selected.length === 2) {

      setMoves((prev) => prev + 1);

      const [first, second] = selected;

      if (first.symbol === second.symbol) {

        setCards((prev) =>
          prev.map((card) =>
            card.symbol === first.symbol
              ? { ...card, matched: true }
              : card
          )
        );

        setMatches((prev) => prev + 1);

        setScore((prev) => prev + 20);

        setSelected([]);

      } else {

        setTimeout(() => {

          setCards((prev) =>
            prev.map((card) =>
              card.id === first.id || card.id === second.id
                ? { ...card, flipped: false }
                : card
            )
          );

          setSelected([]);

        }, 700);
      }
    }

  }, [selected]);

  /* LEVEL COMPLETE */

  useEffect(() => {

    const levelData = memoryLevels[level - 1];

    if (matches === levelData.pairs) {

      setCompleted(true);

    }

  }, [matches]);

  /* FLIP CARD */

  const flipCard = (card: any) => {

    if (
      card.flipped ||
      card.matched ||
      selected.length === 2
    ) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? { ...c, flipped: true }
          : c
      )
    );

    setSelected((prev) => [...prev, card]);
  };

  /* NEXT LEVEL */

  const nextLevel = () => {

    if (level < 20) {

      setLevel((prev) => prev + 1);

      setSelected([]);

    }
  };

  /* RESET */

  const restart = () => {

    setLevel(1);

    setScore(0);
  };

  return (
    <div>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">

        <div>

          <div className="flex items-center gap-3 mb-3">

            <Brain className="text-emerald-400" size={40} />

            <h1 className="text-5xl font-black">
              Memory Match Pro
            </h1>

          </div>

          <p className="text-slate-400 text-lg">
            Advanced cognitive memory training
          </p>

        </div>

        <button
          onClick={restart}
          className="bg-emerald-500 hover:bg-emerald-600 transition-all px-6 py-4 rounded-2xl flex items-center gap-3 font-bold"
        >

          <RotateCcw />

          Restart

        </button>

      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-5 mb-10">

        <div className="bg-[#0f172a] rounded-3xl p-6">

          <p className="text-slate-400 mb-2">
            Current Level
          </p>

          <h1 className="text-5xl font-black text-cyan-400">
            {level}
          </h1>

        </div>

        <div className="bg-[#0f172a] rounded-3xl p-6">

          <p className="text-slate-400 mb-2">
            Moves
          </p>

          <h1 className="text-5xl font-black text-pink-400">
            {moves}
          </h1>

        </div>

        <div className="bg-[#0f172a] rounded-3xl p-6">

          <p className="text-slate-400 mb-2">
            Matches
          </p>

          <h1 className="text-5xl font-black text-yellow-400">
            {matches}
          </h1>

        </div>

        <div className="bg-[#0f172a] rounded-3xl p-6">

          <p className="text-slate-400 mb-2">
            Brain XP
          </p>

          <h1 className="text-5xl font-black text-emerald-400">
            {score}
          </h1>

        </div>

      </div>

      {/* LEVEL BAR */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-8">

        {memoryLevels.map((lvl) => (

          <div
            key={lvl.level}
            className={`
              min-w-[80px]
              h-[80px]
              rounded-3xl
              flex flex-col items-center justify-center
              font-bold
              border
              ${
                lvl.level === level
                  ? "bg-emerald-500 border-emerald-300"
                  : lvl.level < level
                  ? "bg-cyan-500 border-cyan-300"
                  : "bg-[#0f172a] border-white/10"
              }
            `}
          >

            {lvl.level > level ? (
              <Lock size={18} />
            ) : (
              <Trophy size={18} />
            )}

            <span>{lvl.level}</span>

          </div>

        ))}

      </div>

      {/* WIN BOX */}
      {completed && (

        <div className="bg-emerald-500/20 border border-emerald-500 rounded-3xl p-6 mb-8">

          <h1 className="text-3xl font-bold text-emerald-300 mb-3">
            Level {level} Completed!
          </h1>

          <button
            onClick={nextLevel}
            className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-2xl font-bold"
          >
            Next Level →
          </button>

        </div>
      )}

      {/* GAME BOARD */}
      <div
        className="
          grid
          grid-cols-3
          md:grid-cols-5
          lg:grid-cols-6
          gap-5
        "
      >

        {cards.map((card) => (

          <div
            key={card.id}
            onClick={() => flipCard(card)}
            className={`
              h-28 rounded-3xl
              flex items-center justify-center
              cursor-pointer
              text-5xl
              transition-all duration-300
              border
              ${
                card.flipped || card.matched
                  ? "bg-gradient-to-br from-emerald-400 to-cyan-500 border-emerald-300 scale-105"
                  : "bg-[#0f172a] border-white/10 hover:border-emerald-400 hover:scale-105"
              }
            `}
          >

            {card.flipped || card.matched
              ? card.symbol
              : "?"}

          </div>

        ))}

      </div>

    </div>
  );
}