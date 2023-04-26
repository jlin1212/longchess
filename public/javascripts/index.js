ROWS = 8

START = ['rnbqkbnr/pppppppp', 'PPPPPPPP/RNBQKBNR'];
// START = ['rrrrkrrr/pppppppp', 'PPPPPPPP/RRRRKRRR'];
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

WS_URL = '7c85-129-2-192-187.ngrok-free.app'
WS_URL = 'localhost:3000'
WS_PROTOCOL = 'wss'
WS_PROTOCOL = 'ws'

CURR_SIDE = 1
CURR_MOVE = 1
CURR_PLY = 0
CURR_PIECE = null
STARTED = false

SESSION = null;
SESSION_ID = null;

$(function() {
    // generate squares
    for (var i = 0; i < ROWS; i++) {
        $('#board').append('<div class="row"></div>')
        for (var j = 0; j < 8; j++) {
            var color = ((i % 2) + j) % 2;
            $('#board .row:last-of-type').append(`<div class='square ${color == 1 ? 'dark' : 'light'}'></div>`);
        }
    }

    $('#session, #info-bg').click(_ => {
        $('#session-info').toggle();
        $(document.body).toggleClass('no-scroll');
    });

    $('#connect').click(evt => {
        SESSION = new WebSocket(`${WS_PROTOCOL}://${WS_URL}/`);
        
        SESSION.onopen = function(evt) {
            let code = $('#session-code').val().trim();
            SESSION.send(JSON.stringify({
                type: 'connect',
                code: code.length > 0 ? code : null
            }));
        };
        
        SESSION.onmessage = function(evt) {
            msg = JSON.parse(evt.data);
            console.log(msg);
            switch(msg.type) {
                case 'id':
                    if (msg.content != null) {
                        SESSION_ID = msg.content;
                        CURR_SIDE = msg.side;
                        populateBoard();
                        $('#session-id').html(`Your current session ID is <span class='session-label'>${SESSION_ID}</span>`);
                        $('#connect-controls').hide();
                    } else {
                        alert('That session ID was invalid.');
                    }
                    break;
                case 'move':
                    makeMove(msg.fr, msg.fc, msg.tr, msg.tc);
                    break;
                case 'promote':
                    target = getSquarePiece(getSquare(msg.tr, msg.tc));
                    target.type = msg.to;
                    target.sprite();
                    break;
                case 'start':
                    STARTED = true
                    $('#session').css('background-color', 'darkgreen');
                    updatePieces();
                    break;
            }
        };
    })
    
    $(window).resize(() => refreshPositions());
});

function populateBoard() {
    // data labelling squares
    for (var i = 0; i < ROWS; i++) {
        for (var j = 0; j < 8; j++) {
            $(getSquare(i,j)).attr('data-row', i).attr('data-col', j);
        }
    }

    // label squares
    for (var i = 0; i < ROWS; i++) {
        var color = 1 - (((i % 2) + ROWS-1) % 2);
        $(getSquare(i,7)).append(`<div class='label number ${color == 1 ? 'dark' : 'light'} ${CURR_SIDE == 0 ? 'flip' : 'noflip'}'>${ROWS-i}</div>`)
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
    $('.piece').mousedown(function() {
        if (!$(this).hasClass('other') && !$(this).hasClass('ui-draggable-disabled')) {
            let piece = getPiece(this);
            CURR_PIECE = piece;
            clearAvailable();
            piece.showAvailable();
        }
    });

    // square click listeners
    $('.square').click(function() {
        if ($(this).hasClass('available')) {
            movePiece(CURR_PIECE, this);
        } else clearAvailable();
    });
}

class Piece {
    constructor(elem, type, side) {
        this.elem = elem;
        this.type = type;
        this.side = side;
        this.leap = -100;
        this.index = 0;
        this.captured = false;
        this.moved = false;
        this.position = [4,4];
        this.setPosition(4,4);
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

    toPosition() {
        this.setPosition(this.position[0], this.position[1]);
    }

    hide() {
        this.elem.hide();
    }

    moveable() {
        if (!STARTED || this.side != CURR_SIDE || this.side != CURR_MOVE) this.elem.addClass('other');
        else this.elem.removeClass('other');
        this.elem.removeClass('other');
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
                if (!this.moved) available.push(...getCastle(this.position[0], this.position[1], this.side));
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

function endMove(noply) {
    if (!noply) {
        CURR_PLY++;
        CURR_MOVE = 1 - CURR_MOVE;
        CURR_PIECE = null;
        clearAvailable();
        updatePieces();
        console.log(CURR_PLY);
    }
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
    let rowIdx = CURR_SIDE == 1 ? row : ROWS - 1 - row;
    let colIdx = CURR_SIDE == 1 ? col : 8 - 1 - col;
    return $($('#board .row')[rowIdx]).children('.square')[colIdx];
}

function getRowCol(elem) {
    return [parseInt(elem.dataset.row), parseInt(elem.dataset.col)];
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
        // check diagonals
        let dx = Math.pow(-1, i);
        let dy = coeff;
        let square = getSquare(row + dy, col + dx);
        if (square && eval(square.dataset.occupied) && square.dataset.side != side) result.push(square);

        // check either side for en passant
        let next = getSquare(row, col + dx);
        let piece = next ? getSquarePiece(next) : undefined;
        if (piece && piece.side != side && piece.type.toLowerCase() == 'p' && piece.leap == CURR_PLY - 1)
            result.push(square);
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

function getCastle(row, col, side) {
    let result = [];
    for (let d = 0; d < 2; d++) {
        let dc = Math.pow(-1, d);
        for (let i = col + dc; i >= 0 && i < 8; i += dc) {
            let square = getSquare(row, i);
            if (eval(square.dataset.occupied) && i != 0 && i != 7) break;
            let piece = getSquarePiece(square);
            if (!piece.moved && piece.type.toLowerCase() == 'r')
                result.push(getSquare(row, col + dc * 2));
        }
    }
    return result;
}

function getDirectionalPiece(row, col, dr, dc, num) {
    let i = 0;
    while (!num || i < num) {
        let square = getSquare(row + dr * i, col + dc * i);
        if (square === undefined) break;
        if (eval(square.dataset.occupied)) return getSquarePiece(square);
        i++;
    }
    return null;
}

function refreshPositions() {
    PIECES.forEach((piece) => piece.toPosition());
}

function canAccess(square, side) {
    return eval(square.dataset.occupied) ? (eval(square.dataset.side) != side) : true;
}

function movePiece(piece, elem, noply, nolight) {
    if (piece == null) return;

    // highlight from-to
    if (!nolight) {
        $('.square').removeClass('highlight');
        $(getSquare(piece.position[0], piece.position[1])).addClass('highlight');
        $(elem).addClass('highlight');
    }

    let dest = getRowCol(elem);
    let dr = piece.position[0] - dest[0];
    let dc = piece.position[1] - dest[1];

    if (!noply && !nolight && dr != 0 || dc != 0) {
        piece.moved = true;
        SESSION.send(JSON.stringify({
            type: 'move',
            sessionId: SESSION_ID,
            side: CURR_SIDE,
            fr: piece.position[0], 
            fc: piece.position[1],
            tr: dest[0],
            tc: dest[1]
        }));
    }

    // special move cases
    switch (piece.type.toLowerCase()) {
        case 'k':
            if (Math.abs(dc) == 2) {
                let rook = (dc > 0) ? getSquarePiece(getSquare(piece.position[0], 0)) : getSquarePiece(getSquare(piece.position[0], 7));
                let move = (dc > 0) ? 3 : 7-2;
                movePiece(rook, getSquare(piece.position[0], move), true, true);
            }
            break;
        case 'p':
            if (Math.abs(dr) == 2) piece.leap = CURR_PLY;
            if (Math.abs(dr) == 1 && Math.abs(dc) == 1 && !eval(elem.dataset.occupied)) {
                let pawn = getSquarePiece(getSquare(piece.position[0], piece.position[1] - dc));
                pawn.hide();
            }
            if (dest[0] == 0 && piece.side == 1) {
                piece.type = 'Q';
                piece.sprite();
                SESSION.send(JSON.stringify({
                    type: 'promote',
                    sessionId: SESSION_ID,
                    side: CURR_SIDE,
                    to: 'Q',
                    tr: dest[0],
                    tc: dest[1]
                }));
            }
            if (dest[0] == ROWS - 1 && piece.side == 0) {
                piece.type = 'q';
                piece.sprite();
                SESSION.send(JSON.stringify({
                    type: 'promote',
                    sessionId: SESSION_ID,
                    side: CURR_SIDE,
                    to: 'q',
                    tr: dest[0],
                    tc: dest[1]
                }));
            } 
            break;
    }
    if (eval(elem.dataset.occupied) && eval(elem.dataset.side) != piece.side)
        getSquarePiece(elem).hide();
    piece.setPosition(elem.dataset['row'], elem.dataset['col'], true);

    endMove(dr == 0 && dc == 0 || noply);
}

function makeMove(fr, fc, tr, tc) {
    movePiece(getSquarePiece(getSquare(fr, fc)), getSquare(tr, tc));
}

function updatePieces() {
    PIECES.forEach(piece => piece.moveable());
}

function updateMove(side) {
    CURR_MOVE = side;
    updatePieces();
}