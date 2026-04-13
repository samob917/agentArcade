import { describe, it, expect } from "vitest";
import { connect4Game } from "./index";
import type { Connect4State } from "./index";

const players = [
  { id: "p1", seat: 0, isHuman: true, displayName: "Player 1" },
  { id: "p2", seat: 1, isHuman: false, displayName: "Agent 2" },
];

describe("Connect4", () => {
  it("creates initial state with empty board", () => {
    const state = connect4Game.createInitialState({}, players);
    expect(state.board.length).toBe(6);
    expect(state.board[0].length).toBe(7);
    expect(state.board.flat().every((c) => c === 0)).toBe(true);
    expect(state.players).toEqual(["p1", "p2"]);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("validates moves correctly", () => {
    const state = connect4Game.createInitialState({}, players);

    // Valid move
    expect(connect4Game.validateMove(state, "p1", { column: 3 })).toBeNull();

    // Wrong player
    expect(connect4Game.validateMove(state, "p2", { column: 3 })).toBe(
      "Not your turn",
    );

    // Out of bounds
    expect(connect4Game.validateMove(state, "p1", { column: -1 })).toMatch(
      /Column must be/,
    );
    expect(connect4Game.validateMove(state, "p1", { column: 7 })).toMatch(
      /Column must be/,
    );
  });

  it("applies moves and alternates turns", () => {
    let state = connect4Game.createInitialState({}, players);

    // Player 1 drops in column 3
    state = connect4Game.applyMove(state, "p1", { column: 3 });
    expect(state.board[5][3]).toBe(1); // bottom row, player 1
    expect(state.currentPlayerIndex).toBe(1); // now player 2's turn
    expect(state.moveHistory).toEqual([3]);

    // Player 2 drops in column 3
    state = connect4Game.applyMove(state, "p2", { column: 3 });
    expect(state.board[4][3]).toBe(2); // stacks on top
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("detects horizontal win", () => {
    let state = connect4Game.createInitialState({}, players);

    // p1 plays columns 0,1,2,3 with p2 playing column 6 in between
    state = connect4Game.applyMove(state, "p1", { column: 0 });
    state = connect4Game.applyMove(state, "p2", { column: 6 });
    state = connect4Game.applyMove(state, "p1", { column: 1 });
    state = connect4Game.applyMove(state, "p2", { column: 6 });
    state = connect4Game.applyMove(state, "p1", { column: 2 });
    state = connect4Game.applyMove(state, "p2", { column: 6 });
    state = connect4Game.applyMove(state, "p1", { column: 3 });

    const result = connect4Game.getResult(state);
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe("p1");
    expect(result!.reason).toBe("four_in_a_row");
  });

  it("detects vertical win", () => {
    let state = connect4Game.createInitialState({}, players);

    // p1 stacks column 0, p2 plays column 1
    state = connect4Game.applyMove(state, "p1", { column: 0 });
    state = connect4Game.applyMove(state, "p2", { column: 1 });
    state = connect4Game.applyMove(state, "p1", { column: 0 });
    state = connect4Game.applyMove(state, "p2", { column: 1 });
    state = connect4Game.applyMove(state, "p1", { column: 0 });
    state = connect4Game.applyMove(state, "p2", { column: 1 });
    state = connect4Game.applyMove(state, "p1", { column: 0 });

    const result = connect4Game.getResult(state);
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe("p1");
  });

  it("detects diagonal win", () => {
    let state = connect4Game.createInitialState({}, players);

    // Build a diagonal: p1 at (5,0), (4,1), (3,2), (2,3)
    // Column 0: p1
    state = connect4Game.applyMove(state, "p1", { column: 0 });
    // Column 1: p2, then p1
    state = connect4Game.applyMove(state, "p2", { column: 1 });
    state = connect4Game.applyMove(state, "p1", { column: 1 });
    // Column 2: p2, p2, p1
    state = connect4Game.applyMove(state, "p2", { column: 2 });
    state = connect4Game.applyMove(state, "p1", { column: 6 }); // filler
    state = connect4Game.applyMove(state, "p2", { column: 2 });
    state = connect4Game.applyMove(state, "p1", { column: 2 });
    // Column 3: p2, p2, p2, p1
    state = connect4Game.applyMove(state, "p2", { column: 3 });
    state = connect4Game.applyMove(state, "p1", { column: 6 }); // filler
    state = connect4Game.applyMove(state, "p2", { column: 3 });
    state = connect4Game.applyMove(state, "p1", { column: 6 }); // filler
    state = connect4Game.applyMove(state, "p2", { column: 3 });
    state = connect4Game.applyMove(state, "p1", { column: 3 });

    const result = connect4Game.getResult(state);
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe("p1");
  });

  it("detects full column", () => {
    let state = connect4Game.createInitialState({}, players);

    // Fill column 0
    for (let i = 0; i < 3; i++) {
      state = connect4Game.applyMove(state, "p1", { column: 0 });
      state = connect4Game.applyMove(state, "p2", { column: 0 });
    }
    // Column 0 is now full
    expect(connect4Game.validateMove(state, "p1", { column: 0 })).toBe(
      "Column is full",
    );
  });

  it("returns active players correctly", () => {
    let state = connect4Game.createInitialState({}, players);
    expect(connect4Game.getActivePlayers(state)).toEqual(["p1"]);

    state = connect4Game.applyMove(state, "p1", { column: 0 });
    expect(connect4Game.getActivePlayers(state)).toEqual(["p2"]);
  });

  it("getVisibleState returns full state (full information game)", () => {
    const state = connect4Game.createInitialState({}, players);
    expect(connect4Game.getVisibleState(state, "p1")).toEqual(state);
    expect(connect4Game.getVisibleState(state, "spectator")).toEqual(state);
  });
});
