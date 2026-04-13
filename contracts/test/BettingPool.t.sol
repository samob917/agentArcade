// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BettingPool.sol";

contract BettingPoolTest is Test {
    BettingPool pool;
    uint256 signerKey = 0xA11CE;
    address signer;
    address owner;
    address alice = address(0x1);
    address bob = address(0x2);
    address carol = address(0x3);

    bytes32 constant MATCH_ID = keccak256("match-1");

    function setUp() public {
        signer = vm.addr(signerKey);
        owner = address(this);
        pool = new BettingPool(signer);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _createMatch(bytes32 matchId, bool drawAllowed) internal {
        pool.createMatch(matchId, block.timestamp + 1 hours, drawAllowed);
    }

    function _settleMatch(bytes32 matchId, BettingPool.Outcome result) internal {
        bytes32 SETTLE_TYPEHASH = keccak256("SettleMatch(bytes32 matchId,uint8 result)");
        bytes32 structHash = keccak256(abi.encode(SETTLE_TYPEHASH, matchId, result));

        // Get the domain separator by calling the EIP-712 domain
        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            ,

        ) = pool.eip712Domain();

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        pool.settleMatch(matchId, result, signature);
    }

    // --- Basic Tests ---

    function test_createMatch() public {
        _createMatch(MATCH_ID, true);
        (BettingPool.MatchStatus status,,,,,,) = pool.getMatch(MATCH_ID);
        assertEq(uint(status), uint(BettingPool.MatchStatus.Open));
    }

    function test_placeBet() public {
        _createMatch(MATCH_ID, false);

        vm.prank(alice);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);

        (,uint256 poolA,,,,,) = pool.getMatch(MATCH_ID);
        assertEq(poolA, 1 ether);
    }

    function test_cannotBetAfterLock() public {
        pool.createMatch(MATCH_ID, block.timestamp + 10, false);

        vm.warp(block.timestamp + 11);

        vm.prank(alice);
        vm.expectRevert("Betting period ended");
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);
    }

    function test_cannotDoubleBet() public {
        _createMatch(MATCH_ID, false);

        vm.prank(alice);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);

        vm.prank(alice);
        vm.expectRevert("Already bet on this match");
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerB);
    }

    function test_settleAndClaim() public {
        _createMatch(MATCH_ID, false);

        // Alice bets 1 ETH on A, Bob bets 1 ETH on B
        vm.prank(alice);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);

        vm.prank(bob);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerB);

        // Player A wins
        _settleMatch(MATCH_ID, BettingPool.Outcome.PlayerA);

        // Alice claims — should get ~1.95 ETH (2 ETH pool - 2.5% fee)
        uint256 claimable = pool.getClaimable(MATCH_ID, alice);
        assertGt(claimable, 1.9 ether);
        assertLt(claimable, 2 ether);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        pool.claimWinnings(MATCH_ID);
        uint256 balAfter = alice.balance;

        assertEq(balAfter - balBefore, claimable);

        // Bob gets nothing
        assertEq(pool.getClaimable(MATCH_ID, bob), 0);
    }

    function test_cancelRefund() public {
        _createMatch(MATCH_ID, false);

        vm.prank(alice);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);

        pool.cancelMatch(MATCH_ID);

        // Alice gets full refund
        uint256 claimable = pool.getClaimable(MATCH_ID, alice);
        assertEq(claimable, 1 ether);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        pool.claimWinnings(MATCH_ID);
        assertEq(alice.balance - balBefore, 1 ether);
    }

    function test_invalidSignatureReverts() public {
        _createMatch(MATCH_ID, false);

        // Sign with wrong key
        uint256 wrongKey = 0xBAD;
        bytes32 SETTLE_TYPEHASH = keccak256("SettleMatch(bytes32 matchId,uint8 result)");
        bytes32 structHash = keccak256(abi.encode(SETTLE_TYPEHASH, MATCH_ID, BettingPool.Outcome.PlayerA));

        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) = pool.eip712Domain();
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)), keccak256(bytes(version)), chainId, verifyingContract
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, digest);

        vm.expectRevert("Invalid signature");
        pool.settleMatch(MATCH_ID, BettingPool.Outcome.PlayerA, abi.encodePacked(r, s, v));
    }

    // --- Fuzz Tests ---

    function testFuzz_payoutNeverExceedsPool(uint96 betA, uint96 betB) public {
        betA = uint96(bound(betA, 0.01 ether, 1 ether));
        betB = uint96(bound(betB, 0.01 ether, 1 ether));

        bytes32 mid = keccak256(abi.encodePacked("fuzz", betA, betB));
        pool.createMatch(mid, block.timestamp + 1 hours, false);

        vm.prank(alice);
        pool.placeBet{value: betA}(mid, BettingPool.Outcome.PlayerA);

        vm.prank(bob);
        pool.placeBet{value: betB}(mid, BettingPool.Outcome.PlayerB);

        _settleMatch(mid, BettingPool.Outcome.PlayerA);

        uint256 claimable = pool.getClaimable(mid, alice);
        uint256 totalPool = uint256(betA) + uint256(betB);

        // Payout should never exceed total pool
        assertLe(claimable, totalPool);
        // Winner should get more than they bet (minus fees)
        assertGe(claimable, betA * 95 / 100); // at minimum get 95% of own bet back
    }

    function testFuzz_feesAccumulate(uint96 betA, uint96 betB) public {
        betA = uint96(bound(betA, 0.01 ether, 1 ether));
        betB = uint96(bound(betB, 0.01 ether, 1 ether));

        bytes32 mid = keccak256(abi.encodePacked("fees", betA, betB));
        pool.createMatch(mid, block.timestamp + 1 hours, false);

        vm.prank(alice);
        pool.placeBet{value: betA}(mid, BettingPool.Outcome.PlayerA);

        vm.prank(bob);
        pool.placeBet{value: betB}(mid, BettingPool.Outcome.PlayerB);

        uint256 feesBefore = pool.accumulatedFees();

        _settleMatch(mid, BettingPool.Outcome.PlayerA);

        vm.prank(alice);
        pool.claimWinnings(mid);

        uint256 feesAfter = pool.accumulatedFees();
        // Fees should have increased
        assertGt(feesAfter, feesBefore);
    }

    function test_drawBetting() public {
        _createMatch(MATCH_ID, true); // draw allowed

        vm.prank(alice);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.Draw);

        vm.prank(bob);
        pool.placeBet{value: 1 ether}(MATCH_ID, BettingPool.Outcome.PlayerA);

        _settleMatch(MATCH_ID, BettingPool.Outcome.Draw);

        // Alice bet on draw, should win ~1.95 ETH
        uint256 claimable = pool.getClaimable(MATCH_ID, alice);
        assertGt(claimable, 1.9 ether);
    }
}
