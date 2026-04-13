import { describe, it, expect } from "vitest";
import { chessGame } from "./index";

const players = [
  { id: "white", seat: 0, isHuman: true, displayName: "White" },
  { id: "black", seat: 1, isHuman: false, displayName: "Black" },
];

describe("Chess", () => {
  it("creates initial state with standard position", () => {
    const state = chessGame.createInitialState({}, players);
    expect(state.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(state.players).toEqual({ white: "white", black: "black" });
    expect(state.moveHistory).toEqual([]);
  });

  it("validates moves correctly", () => {
    const state = chessGame.createInitialState({}, players);

    // Valid pawn opening
    expect(
      chessGame.validateMove(state, "white", { from: "e2", to: "e4" }),
    ).toBeNull();

    // Wrong player
    expect(
      chessGame.validateMove(state, "black", { from: "e7", to: "e5" }),
    ).toBe("Not your turn");

    // Invalid move
    expect(
      chessGame.validateMove(state, "white", { from: "e2", to: "e5" }),
    ).toBe("Invalid move");
  });

  it("applies moves and alternates turns", () => {
    let state = chessGame.createInitialState({}, players);

    // 1. e4
    state = chessGame.applyMove(state, "white", { from: "e2", to: "e4" });
    expect(state.moveHistory).toEqual(["e2e4"]);
    expect(chessGame.getActivePlayers(state)).toEqual(["black"]);
    expect(state.lastMove).toEqual({ from: "e2", to: "e4" });

    // 1... e5
    state = chessGame.applyMove(state, "black", { from: "e7", to: "e5" });
    expect(state.moveHistory).toEqual(["e2e4", "e7e5"]);
    expect(chessGame.getActivePlayers(state)).toEqual(["white"]);
  });

  it("detects checkmate (Scholar's mate)", () => {
    let state = chessGame.createInitialState({}, players);

    // Scholar's mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#
    const moves = [
      { player: "white", from: "e2", to: "e4" },
      { player: "black", from: "e7", to: "e5" },
      { player: "white", from: "f1", to: "c4" },
      { player: "black", from: "b8", to: "c6" },
      { player: "white", from: "d1", to: "h5" },
      { player: "black", from: "g8", to: "f6" },
      { player: "white", from: "h5", to: "f7" },
    ];

    for (const m of moves) {
      state = chessGame.applyMove(state, m.player, {
        from: m.from,
        to: m.to,
      });
    }

    const result = chessGame.getResult(state);
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe("white");
    expect(result!.reason).toBe("checkmate");
  });

  it("detects check", () => {
    let state = chessGame.createInitialState({}, players);

    // Quick check: 1.e4 e5 2.Qh5 (gives check if king is exposed, but this doesn't actually check)
    // Instead: 1.e4 f6 2.d4 g5 3.Qh5+ (check)
    state = chessGame.applyMove(state, "white", { from: "e2", to: "e4" });
    state = chessGame.applyMove(state, "black", { from: "f7", to: "f6" });
    state = chessGame.applyMove(state, "white", { from: "d2", to: "d4" });
    state = chessGame.applyMove(state, "black", { from: "g7", to: "g5" });
    state = chessGame.applyMove(state, "white", { from: "d1", to: "h5" });

    expect(state.isCheck).toBe(true);
  });

  it("getVisibleState returns full state", () => {
    const state = chessGame.createInitialState({}, players);
    expect(chessGame.getVisibleState(state, "white")).toEqual(state);
    expect(chessGame.getVisibleState(state, "spectator")).toEqual(state);
  });

  it("returns no result for in-progress game", () => {
    let state = chessGame.createInitialState({}, players);
    state = chessGame.applyMove(state, "white", { from: "e2", to: "e4" });
    expect(chessGame.getResult(state)).toBeNull();
  });
});
