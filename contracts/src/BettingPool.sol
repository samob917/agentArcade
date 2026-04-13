// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BettingPool
 * @notice Parimutuel betting pool for Agent Arcade matches.
 *         Users bet ETH (or USDC in production) on match outcomes.
 *         Settlement is server-signed via EIP-712.
 */
contract BettingPool is ReentrancyGuard, EIP712, Ownable {
    using ECDSA for bytes32;

    // --- Types ---

    enum MatchStatus { Open, Locked, Settled, Cancelled }
    enum Outcome { None, PlayerA, PlayerB, Draw }

    struct Match {
        bytes32 matchId;
        MatchStatus status;
        uint256 totalPoolA;
        uint256 totalPoolB;
        uint256 totalPoolDraw;
        uint256 lockTime;
        bool drawAllowed;
        Outcome result;
    }

    struct Bet {
        Outcome outcome;
        uint256 amount;
        bool claimed;
    }

    // --- State ---

    /// @notice Authorized settlement signer
    address public settlementSigner;

    /// @notice Platform fee in basis points (e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250;

    /// @notice Accumulated platform fees available for withdrawal
    uint256 public accumulatedFees;

    /// @notice Maximum bet amount (in wei)
    uint256 public maxBetAmount = 1 ether;

    /// @notice Match data
    mapping(bytes32 => Match) public matches;

    /// @notice matchId => bettor => Bet
    mapping(bytes32 => mapping(address => Bet)) public bets;

    // --- Events ---

    event MatchCreated(bytes32 indexed matchId, uint256 lockTime, bool drawAllowed);
    event BetPlaced(bytes32 indexed matchId, address indexed bettor, Outcome outcome, uint256 amount);
    event MatchSettled(bytes32 indexed matchId, Outcome result);
    event MatchCancelled(bytes32 indexed matchId);
    event WinningsClaimed(bytes32 indexed matchId, address indexed bettor, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // --- EIP-712 ---

    bytes32 private constant SETTLE_TYPEHASH =
        keccak256("SettleMatch(bytes32 matchId,uint8 result)");

    // --- Constructor ---

    constructor(address _settlementSigner)
        EIP712("AgentArcade", "1")
        Ownable(msg.sender)
    {
        require(_settlementSigner != address(0), "Invalid signer");
        settlementSigner = _settlementSigner;
    }

    // --- Match Management (Owner only) ---

    function createMatch(
        bytes32 matchId,
        uint256 lockTime,
        bool drawAllowed
    ) external onlyOwner {
        require(matches[matchId].lockTime == 0, "Match exists");
        require(lockTime > block.timestamp, "Lock time must be future");

        matches[matchId] = Match({
            matchId: matchId,
            status: MatchStatus.Open,
            totalPoolA: 0,
            totalPoolB: 0,
            totalPoolDraw: 0,
            lockTime: lockTime,
            drawAllowed: drawAllowed,
            result: Outcome.None
        });

        emit MatchCreated(matchId, lockTime, drawAllowed);
    }

    // --- Betting ---

    function placeBet(bytes32 matchId, Outcome outcome) external payable nonReentrant {
        Match storage m = matches[matchId];
        require(m.lockTime > 0, "Match not found");
        require(m.status == MatchStatus.Open, "Betting closed");
        require(block.timestamp < m.lockTime, "Betting period ended");
        require(msg.value > 0 && msg.value <= maxBetAmount, "Invalid bet amount");
        require(outcome == Outcome.PlayerA || outcome == Outcome.PlayerB ||
                (outcome == Outcome.Draw && m.drawAllowed), "Invalid outcome");
        require(bets[matchId][msg.sender].amount == 0, "Already bet on this match");

        bets[matchId][msg.sender] = Bet({
            outcome: outcome,
            amount: msg.value,
            claimed: false
        });

        if (outcome == Outcome.PlayerA) m.totalPoolA += msg.value;
        else if (outcome == Outcome.PlayerB) m.totalPoolB += msg.value;
        else m.totalPoolDraw += msg.value;

        emit BetPlaced(matchId, msg.sender, outcome, msg.value);
    }

    // --- Settlement ---

    /**
     * @notice Settle a match with a server-signed result.
     * @param matchId The match identifier
     * @param result The outcome (PlayerA, PlayerB, or Draw)
     * @param signature EIP-712 signature from the settlement signer
     */
    function settleMatch(
        bytes32 matchId,
        Outcome result,
        bytes calldata signature
    ) external {
        Match storage m = matches[matchId];
        require(m.lockTime > 0, "Match not found");
        require(m.status == MatchStatus.Open || m.status == MatchStatus.Locked, "Cannot settle");
        require(result != Outcome.None, "Invalid result");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(abi.encode(SETTLE_TYPEHASH, matchId, result));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == settlementSigner, "Invalid signature");

        m.result = result;
        m.status = MatchStatus.Settled;

        emit MatchSettled(matchId, result);
    }

    // --- Claims ---

    function claimWinnings(bytes32 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        Bet storage bet = bets[matchId][msg.sender];

        require(bet.amount > 0, "No bet found");
        require(!bet.claimed, "Already claimed");

        uint256 payout;

        if (m.status == MatchStatus.Cancelled) {
            // Full refund on cancellation
            payout = bet.amount;
        } else if (m.status == MatchStatus.Settled) {
            if (bet.outcome != m.result) {
                revert("Bet did not win");
            }
            payout = _calculatePayout(m, bet.amount);
        } else {
            revert("Match not resolved");
        }

        bet.claimed = true;

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");

        emit WinningsClaimed(matchId, msg.sender, payout);
    }

    function getClaimable(bytes32 matchId, address bettor) external view returns (uint256) {
        Match storage m = matches[matchId];
        Bet storage bet = bets[matchId][bettor];

        if (bet.amount == 0 || bet.claimed) return 0;

        if (m.status == MatchStatus.Cancelled) return bet.amount;

        if (m.status == MatchStatus.Settled && bet.outcome == m.result) {
            return _calculatePayoutView(m, bet.amount);
        }

        return 0;
    }

    // --- Cancel ---

    function cancelMatch(bytes32 matchId) external onlyOwner {
        Match storage m = matches[matchId];
        require(m.lockTime > 0, "Match not found");
        require(m.status != MatchStatus.Settled, "Already settled");

        m.status = MatchStatus.Cancelled;
        emit MatchCancelled(matchId);
    }

    // --- Admin ---

    function setSettlementSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer");
        settlementSigner = _signer;
    }

    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // max 10%
        platformFeeBps = _feeBps;
    }

    function setMaxBetAmount(uint256 _maxBet) external onlyOwner {
        maxBetAmount = _maxBet;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Transfer failed");
        emit FeesWithdrawn(to, amount);
    }

    // --- Internal ---

    function _calculatePayout(Match storage m, uint256 betAmount) internal returns (uint256) {
        uint256 totalPool = m.totalPoolA + m.totalPoolB + m.totalPoolDraw;
        uint256 winningPool;

        if (m.result == Outcome.PlayerA) winningPool = m.totalPoolA;
        else if (m.result == Outcome.PlayerB) winningPool = m.totalPoolB;
        else winningPool = m.totalPoolDraw;

        if (winningPool == 0) return 0;

        // Bettor's share = (betAmount / winningPool) * totalPool
        uint256 grossPayout = (betAmount * totalPool) / winningPool;

        // Deduct platform fee
        uint256 fee = (grossPayout * platformFeeBps) / 10000;
        accumulatedFees += fee;

        return grossPayout - fee;
    }

    function _calculatePayoutView(Match storage m, uint256 betAmount) internal view returns (uint256) {
        uint256 totalPool = m.totalPoolA + m.totalPoolB + m.totalPoolDraw;
        uint256 winningPool;

        if (m.result == Outcome.PlayerA) winningPool = m.totalPoolA;
        else if (m.result == Outcome.PlayerB) winningPool = m.totalPoolB;
        else winningPool = m.totalPoolDraw;

        if (winningPool == 0) return 0;

        uint256 grossPayout = (betAmount * totalPool) / winningPool;
        uint256 fee = (grossPayout * platformFeeBps) / 10000;

        return grossPayout - fee;
    }

    // --- Views ---

    function getMatch(bytes32 matchId) external view returns (
        MatchStatus status,
        uint256 totalPoolA,
        uint256 totalPoolB,
        uint256 totalPoolDraw,
        uint256 lockTime,
        bool drawAllowed,
        Outcome result
    ) {
        Match storage m = matches[matchId];
        return (m.status, m.totalPoolA, m.totalPoolB, m.totalPoolDraw, m.lockTime, m.drawAllowed, m.result);
    }

    function getOdds(bytes32 matchId) external view returns (
        uint256 oddsA,
        uint256 oddsB,
        uint256 oddsDraw
    ) {
        Match storage m = matches[matchId];
        uint256 totalPool = m.totalPoolA + m.totalPoolB + m.totalPoolDraw;
        if (totalPool == 0) return (0, 0, 0);

        // Odds as multiplier * 1e18 (e.g., 2x = 2e18)
        oddsA = m.totalPoolA > 0 ? (totalPool * 1e18) / m.totalPoolA : 0;
        oddsB = m.totalPoolB > 0 ? (totalPool * 1e18) / m.totalPoolB : 0;
        oddsDraw = m.totalPoolDraw > 0 ? (totalPool * 1e18) / m.totalPoolDraw : 0;
    }
}
