ROWS = 8

START = ['rnbqkbnr/pppppppp', 'PPPPPPPP/RNBQKBNR'];
SIDES = []
POSITIONS = {
    'K': [0,0],
    'Q': [1,0],
    'B': [2,0],
    'N': [3,0],
    'R': [4,0],
    'P': [5,0],
    'k': [0,1],
    'q': [1,1],
    'b': [2,1],
    'n': [3,1],
    'r': [4,1],
    'p': [5,1],
}
PIECES = []
BLACK = []
WHITE = []

CURR_SIDE = 1
CURR_MOVE = 1
CURR_PIECE = null

$(function() {
    // generate squares
    for (var i = 0; i < ROWS; i++) {
        $('#board').append('<div class="row"></div>')
        for (var j = 0; j < 8; j++) {
            var color = ((i % 2) + j) % 2;
            $('#board .row:last-of-type').append(`<div class='square ${color == 1 ? 'dark' : 'light'}' data-row=${i} data-col=${j}></div>`);
        }
    }

    // label squares
    for (var i = 0; i < ROWS; i++) {
        var color = 1 - (((i % 2) + ROWS-1) % 2);
        $(getSquare(i,7)).append(`<div class='label number ${color == 1 ? 'dark' : 'light'}'>${ROWS-i}</div>`)
    }

    for (var i = 0; i < 8; i++) {
        var color = 1 - (((i % 2) + ROWS-1) % 2);
        $(getSquare(ROWS-1,i)).append(`<div class='label ${color == 1 ? 'dark' : 'light'}'>${String.fromCharCode(97+i)}</div>`)
    }

    // add pieces
    for (var s = 0; s < 2; s++) {
        let offset = (s == 0) ? 0 : ROWS - 2;
        let pieceRows = START[s].split('/');
        for (var i = 0; i < 2; i++) {
            let pieceCols = pieceRows[i].split('');
            for (var j = 0; j < 8; j++) {
                $(document.body).append(`<div class='piece' data-type='${pieceCols[j]}' data-idx=${PIECES.length}>${pieceCols[j]}</div>`);
                let piece = new Piece($('.piece:last-of-type'), pieceCols[j], s);
                piece.index = PIECES.length;
                PIECES.push(piece);
                (s == 0) ? BLACK.push(piece) : WHITE.push(piece);
                piece.sprite();
                piece.moveable();
                piece.setPosition(offset + i, j)
            }
        }
    }

    // only accept drag-and-drop on available squares
    $('.square').droppable({ 
        accept: function() {
            return $(this).hasClass('available');
        },
        drop: function(_, ui) {
            let piece = getPiece(ui.draggable[0]);
            movePiece(piece, this);
        }
    });

    // set draggable
    $('.piece').not('.other').draggable({ revert: 'invalid', revertDuration: 80 });

    // set available squares on click
    $('.piece').not('.other').mousedown(function() {
        let piece = getPiece(this);
        CURR_PIECE = piece;
        clearAvailable();
        piece.showAvailable();
    });

    // square click listeners
    $('.square').click(function() {
        if ($(this).hasClass('available')) {
            movePiece(CURR_PIECE, this);
        } else clearAvailable();
    });    
});

class Piece {
    constructor(elem, type, side) {
        this.elem = elem;
        this.type = type;
        this.side = side;
        this.index = 0;
        this.captured = false;
        this.moved = false;
        this.position = [0,0];
        this.setPosition(0, 0);
    }

    setPosition(row, col, animate) {
        getSquare(this.position[0], this.position[1]).dataset['occupied'] = false;

        let center = getCenter(row, col);
        let width = this.elem.outerWidth();
        let height = this.elem.outerHeight();
        let destX = center[0] - width / 2;
        let destY = center[1] - height / 2;
        
        if (!animate) {
            this.elem.css('left', `${destX}px`);
            this.elem.css('top', `${destY}px`)
        } else {
            this.elem.animate({
                left: `${destX}px`,
                top: `${destY}px`
            }, 100);
        }
        
        getSquare(row, col).dataset['occupied'] = true;
        getSquare(row, col).dataset['piece'] = this.index;
        getSquare(row, col).dataset['side'] = this.side;
        this.position = [parseInt(row), parseInt(col)];
    }

    hide() {
        this.elem.hide();
    }

    moveable() {
        if (this.side != CURR_SIDE) this.elem.addClass('other')
    }

    getAvailable() {
        let available = [getSquare(this.position[0], this.position[1])];

        switch(this.type.toLowerCase()) {
            case 'p':
                available.push(...getForward(this.position[0], this.position[1], this.moved ? 1 : 2, this.side));
                available.push(...getPawnCaptures(this.position[0], this.position[1], this.side));
                break;
            case 'r':
                available.push(...getRanksFiles(this.position[0], this.position[1], null,this.side));
                break;
            case 'n':
                available.push(...getKnightMoves(this.position[0], this.position[1], this.side));
                break;
            case 'b':
                available.push(...getDiagonals(this.position[0], this.position[1], null, this.side));
                break;
            case 'q':
                available.push(...getRanksFiles(this.position[0], this.position[1], null, this.side));
                available.push(...getDiagonals(this.position[0], this.position[1], null, this.side));
                break;
            case 'k':
                available.push(...getDiagonals(this.position[0], this.position[1], 1, this.side));
                available.push(...getRanksFiles(this.position[0], this.position[1], 1, this.side));
                if (!this.moved) getCastle(this.position[0], this.position[1]);
                break;
        }

        return available;
    }

    showAvailable() {
        let available = this.getAvailable();
        available.forEach((square) => $(square).addClass('available'));
    }

    sprite() {
        let pos = POSITIONS[this.type];
        this.elem.css('background-position', `${-pos[0] * 70}px ${-pos[1] * 70}px`);
    }
}

function clearAvailable() {
    $('.square').removeClass('available');
}

function setDragging(bool) {
    if (bool) $('.piece').not('.other').draggable('enable')
    else $('.piece').not('.other').draggable('disable');
}

function endMove() {
    CURR_MOVE = 1 - CURR_MOVE;
    CURR_PIECE = null;
    clearAvailable();
}

function getCenter(row, col) {
    let square = $(getSquare(row, col));
    let offset = square.offset();
    return [offset.left + square.outerWidth() / 2, offset.top + square.outerHeight() / 2];
}

function getPiece(elem) {
    return PIECES[elem.dataset['idx']];
}

function getSquarePiece(elem) {
    return PIECES[elem.dataset['piece']];
}

function getSquare(row, col) {
    return $($('#board .row')[row]).children('.square')[col];
}

function getForward(row, col, num, side) {
    // if side = 0, black - the "forward" direction is in +row direction
    let coeff = (side == 0) ? 1 : -1;
    let result = [];
    for (var i = 0; i < num; i++) {
        let idx = row + coeff * (i + 1);
        if (idx < ROWS && idx >= 0) {
            let square = getSquare(idx, col)
            if (square && !eval(square.dataset.occupied)) result.push(square);
        }
        else break;
    }
    return result;
}

function getPawnCaptures(row, col, side) {
    let coeff = (side == 0) ? 1 : -1;
    let result = [];
    for (var i = 0; i < 2; i++) {
        let dx = Math.pow(-1, i);
        let dy = coeff;
        let square = getSquare(row + dy, col + dx);
        if (square && eval(square.dataset.occupied) && square.dataset.side != side) result.push(square);
    }
    return result;
}

function getDirectionalFunction(row, col, num, fx, fy, side) {
    let result = [];
    
    for (var d = 0; d < 4; d++) {
        let cx = fx(d);
        let cy = fy(d);
        for (var i = 0; i < (num ? num : ROWS); i++) {
            let ir = row + cx * (i + 1);
            let ic = col + cy * (i + 1);
            if (ir >= ROWS || ir < 0 || ic >= 8 || ic < 0) break;
            let square = getSquare(ir, ic);
            if (canAccess(square, side)) result.push(square);
            if (eval(square.dataset.occupied)) break;
        }
    }

    return result;
}

function getRanksFiles(row, col, num, side) {
    return getDirectionalFunction(row, col, num, d => (d % 2) * Math.pow(-1, Math.floor(d / 2)), d => ((d + 1) % 2) * Math.pow(-1, Math.floor(d / 2)), side);
}

function getDiagonals(row, col, num, side) {
    return getDirectionalFunction(row, col, num, d => Math.pow(-1, Math.floor(d / 2)), d => Math.pow(-1, d % 2), side);
}

function getKnightMoves(row, col, side) {
    let result = [];
    
    for (var d = 0; d < 4; d++) {
        let cx = (d % 2) * Math.pow(-1, Math.floor(d / 2));
        let cy = ((d + 1) % 2) * Math.pow(-1, Math.floor(d / 2));
        let dx = (cx == 0) ? 1 : 0;
        let dy = (cy == 0) ? 1 : 0;
        for (var i = 0; i < 2; i++) {
            let square = getSquare(row + cx * 2 + Math.pow(-1, i) * dx, col + cy * 2 + Math.pow(-1, i) * dy)
            if (square && canAccess(square, side)) result.push(square);
        }
    }

    return result;
}

function canAccess(square, side) {
    return eval(square.dataset.occupied) ? (eval(square.dataset.side) != side) : true;
}

function movePiece(piece, elem) {
    if (piece == null) return;
    if (elem.dataset['row'] != piece.position[0] || elem.dataset['col'] != piece.position[1]) piece.moved = true;
    if (eval(elem.dataset.occupied) && eval(elem.dataset.side) != piece.side)
        getSquarePiece(elem).hide();
    piece.setPosition(elem.dataset['row'], elem.dataset['col'], true);
    endMove();
}

function makeMove(fr, fc, tr, tc) {
    movePiece(getSquarePiece(getSquare(fr, fc)), getSquare(tr, tc));
}