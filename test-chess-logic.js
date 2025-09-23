// Chess Logic Test Script
// Run this in browser console to test basic functionality

console.log("=== CHESS ENGINE LOGIC TEST ===");

// Test 1: Board Initialization
function testBoardInitialization() {
    console.log("\n1. Testing Board Initialization...");
    
    const engine = new ChessEngine();
    const board = engine.board;
    
    // Check board dimensions
    console.log(`Board dimensions: ${board.length}x${board[0].length}`);
    
    // Check piece placement
    const expectedWhitePieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    const expectedBlackPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    
    // Verify white pieces (row 7 = rank 1)
    console.log("White back rank (row 7):", board[7].map(p => p ? p.type : 'empty'));
    console.log("White pawns (row 6):", board[6].map(p => p ? p.type : 'empty'));
    
    // Verify black pieces (row 0 = rank 8)
    console.log("Black back rank (row 0):", board[0].map(p => p ? p.type : 'empty'));
    console.log("Black pawns (row 1):", board[1].map(p => p ? p.type : 'empty'));
    
    // Count total pieces
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col]) pieceCount++;
        }
    }
    console.log(`Total pieces on board: ${pieceCount} (expected: 32)`);
    
    return engine;
}

// Test 2: Coordinate System
function testCoordinateSystem(engine) {
    console.log("\n2. Testing Coordinate System...");
    
    // Test square notation
    console.log("a1 should be row 7, col 0:", engine.getSquareNotation(7, 0));
    console.log("h8 should be row 0, col 7:", engine.getSquareNotation(0, 7));
    console.log("e4 should be row 4, col 4:", engine.getSquareNotation(4, 4));
    
    // Test piece at starting positions
    console.log("Piece at a1 (7,0):", engine.board[7][0]);
    console.log("Piece at e1 (7,4):", engine.board[7][4]);
    console.log("Piece at e8 (0,4):", engine.board[0][4]);
}

// Test 3: Pawn Movement
function testPawnMovement(engine) {
    console.log("\n3. Testing Pawn Movement...");
    
    // Test white pawn at e2 (row 6, col 4)
    const whitePawnMoves = engine.getPawnMoves(6, 4, 'white');
    console.log("White pawn at e2 possible moves:", whitePawnMoves);
    console.log("Should be: [[5,4], [4,4]] (e3, e4)");
    
    // Test black pawn at e7 (row 1, col 4)
    const blackPawnMoves = engine.getPawnMoves(1, 4, 'black');
    console.log("Black pawn at e7 possible moves:", blackPawnMoves);
    console.log("Should be: [[2,4], [3,4]] (e6, e5)");
}

// Test 4: Move Validation
function testMoveValidation(engine) {
    console.log("\n4. Testing Move Validation...");
    
    // Test valid pawn move e2-e4
    const isValid1 = engine.isValidMove(6, 4, 4, 4);
    console.log("e2-e4 valid:", isValid1, "(should be true)");
    
    // Test invalid move
    const isValid2 = engine.isValidMove(6, 4, 3, 3);
    console.log("e2-d5 valid:", isValid2, "(should be false)");
    
    // Test move to occupied square
    const isValid3 = engine.isValidMove(6, 4, 1, 4);
    console.log("e2-e7 valid:", isValid3, "(should be false - occupied)");
}

// Test 5: Basic Move Execution
function testMoveExecution(engine) {
    console.log("\n5. Testing Move Execution...");
    
    console.log("Before move - Current player:", engine.currentPlayer);
    console.log("Before move - e2 contains:", engine.board[6][4]);
    console.log("Before move - e4 contains:", engine.board[4][4]);
    
    // Make move e2-e4
    engine.makeMove(6, 4, 4, 4);
    
    console.log("After move - Current player:", engine.currentPlayer);
    console.log("After move - e2 contains:", engine.board[6][4]);
    console.log("After move - e4 contains:", engine.board[4][4]);
    console.log("Move history length:", engine.moveHistory.length);
}

// Run all tests
function runAllTests() {
    try {
        const engine = testBoardInitialization();
        testCoordinateSystem(engine);
        testPawnMovement(engine);
        testMoveValidation(engine);
        testMoveExecution(engine);
        
        console.log("\n=== TEST COMPLETE ===");
        console.log("Check console output for any issues.");
        
        return engine;
    } catch (error) {
        console.error("Test failed:", error);
        return null;
    }
}

// Auto-run tests if this script is loaded
if (typeof ChessEngine !== 'undefined') {
    runAllTests();
} else {
    console.log("ChessEngine not found. Load chess-engine.js first.");
}