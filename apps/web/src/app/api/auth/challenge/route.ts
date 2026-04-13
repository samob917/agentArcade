import { NextRequest, NextResponse } from "next/server";

const ROBOT_EMOJIS = ["🤖", "🦾", "⚙️", "🔧", "💻", "🖥️"];
const HUMAN_EMOJIS = ["🌸", "🎨", "☕", "🎵", "🌊", "🍕", "🌙", "🎪", "🦋", "🌺", "🍦", "🎭", "🌈", "🎸", "🧁"];

interface ChallengeStore {
  [key: string]: {
    type: "human" | "agent";
    answer: number[] | string;
    expiresAt: number;
  };
}

const challenges: ChallengeStore = {};

// Clean expired challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(challenges)) {
    if (challenges[key].expiresAt < now) delete challenges[key];
  }
}, 60_000);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { type } = body; // "human" | "agent"

  if (type === "human") {
    return generateHumanChallenge();
  } else if (type === "agent") {
    return generateAgentChallenge();
  }

  return NextResponse.json({ error: "type must be 'human' or 'agent'" }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { challengeId, answer, type } = body;

  const challenge = challenges[challengeId];
  if (!challenge) {
    return NextResponse.json({ success: false, error: "Challenge expired or not found" }, { status: 400 });
  }

  if (challenge.expiresAt < Date.now()) {
    delete challenges[challengeId];
    return NextResponse.json({ success: false, error: "Challenge expired" }, { status: 400 });
  }

  if (type === "human") {
    // Answer should be array of indices matching the correct non-robot squares
    const correct = challenge.answer as number[];
    const submitted = (answer as number[]).sort();
    const expected = [...correct].sort();
    const isCorrect =
      submitted.length === expected.length &&
      submitted.every((v, i) => v === expected[i]);

    delete challenges[challengeId];

    if (isCorrect) {
      return NextResponse.json({ success: true, token: crypto.randomUUID() });
    }
    return NextResponse.json({ success: false, error: "Wrong selection. Try again!" });
  }

  if (type === "agent") {
    const expected = challenge.answer as string;
    const isCorrect = answer === expected;

    delete challenges[challengeId];

    if (isCorrect) {
      return NextResponse.json({ success: true, token: crypto.randomUUID() });
    }
    return NextResponse.json({ success: false, error: "Incorrect solution" });
  }

  return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
}

function generateHumanChallenge() {
  const challengeId = crypto.randomUUID();
  const grid: string[] = [];
  const robotIndices: number[] = [];
  const humanIndices: number[] = [];

  // Create a 4x4 grid with ~4-6 robots randomly placed
  const robotCount = 4 + Math.floor(Math.random() * 3);

  for (let i = 0; i < 16; i++) {
    if (robotIndices.length < robotCount && Math.random() < 0.4) {
      grid.push(ROBOT_EMOJIS[Math.floor(Math.random() * ROBOT_EMOJIS.length)]);
      robotIndices.push(i);
    } else {
      grid.push(HUMAN_EMOJIS[Math.floor(Math.random() * HUMAN_EMOJIS.length)]);
      humanIndices.push(i);
    }
  }

  // Ensure we have enough robots
  while (robotIndices.length < robotCount) {
    const idx = humanIndices.pop()!;
    grid[idx] = ROBOT_EMOJIS[Math.floor(Math.random() * ROBOT_EMOJIS.length)];
    robotIndices.push(idx);
  }

  // The answer is the NON-robot indices (humans select the human emojis)
  const answer = Array.from({ length: 16 }, (_, i) => i).filter(
    (i) => !robotIndices.includes(i),
  );

  challenges[challengeId] = {
    type: "human",
    answer,
    expiresAt: Date.now() + 120_000, // 2 minutes
  };

  return NextResponse.json({
    challengeId,
    type: "human",
    grid,
    instruction: "Select all squares that do NOT contain robots or machine parts",
    hint: "A true human knows what's human",
    gridSize: 4,
  });
}

function generateAgentChallenge() {
  const challengeId = crypto.randomUUID();

  // Generate a computational challenge:
  // Given numbers, compute a specific mathematical expression
  const a = Math.floor(Math.random() * 900) + 100; // 3 digit
  const b = Math.floor(Math.random() * 900) + 100;
  const c = Math.floor(Math.random() * 90) + 10;
  const operations = [
    {
      expression: `(${a} * ${b}) + ${c}`,
      answer: String(a * b + c),
    },
    {
      expression: `(${a} ** 2) - (${b} * ${c})`,
      answer: String(a ** 2 - b * c),
    },
    {
      expression: `Math.floor(Math.sqrt(${a * a + b * b})) * ${c}`,
      answer: String(Math.floor(Math.sqrt(a * a + b * b)) * c),
    },
  ];

  const op = operations[Math.floor(Math.random() * operations.length)];

  // Also add: reverse a string, then take first 8 chars
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const reversed = nonce.split("").reverse().join("");
  const reverseAnswer = reversed.slice(0, 8);

  // Compound challenge: solve math AND reverse string
  const finalAnswer = `${op.answer}:${reverseAnswer}`;

  challenges[challengeId] = {
    type: "agent",
    answer: finalAnswer,
    expiresAt: Date.now() + 10_000, // 10 seconds — too fast for humans
  };

  return NextResponse.json({
    challengeId,
    type: "agent",
    challenges: [
      {
        id: "math",
        type: "compute",
        expression: op.expression,
        instruction: "Evaluate this JavaScript expression",
      },
      {
        id: "reverse",
        type: "string",
        input: nonce,
        instruction: "Reverse this string and return the first 8 characters",
      },
    ],
    instruction: "Solve both challenges and return answers joined by ':' (math:reverse)",
    timeLimit: "10 seconds",
    hint: "A human couldn't solve this in time",
  });
}
