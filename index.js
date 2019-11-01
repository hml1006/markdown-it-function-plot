"use strict";

let open = '```fp'
let close = '```'

let _uuidCounter = 0;
function uuid() {
    let id = _uuidCounter++;
    return "function-plot-"+id;
};

function block(state, startLine, endLine, silent) {
    var openDelim, len, params, nextLine, token, firstLine, lastLine, lastLinePos,
        haveEndMarker = false,
        pos = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    if (pos + open.length > max) {
        return false;
    }

    openDelim = state.src.slice(pos, pos + open.length);

    if (openDelim !== open) {
        return false;
    }

    pos += open.length;
    firstLine = state.src.slice(pos, max);

    // Since start is found, we can report success here in validation mode
    if (silent) {
        return true;
    }

    if (firstLine.trim().slice(-close.length) === close) {
        // Single line expression
        firstLine = firstLine.trim().slice(0, -close.length);
        haveEndMarker = true;
    }

    // search end of block
    nextLine = startLine;

    for (; ;) {
        if (haveEndMarker) {
            break;
        }

        nextLine++;

        if (nextLine >= endLine) {
            // unclosed block should be autoclosed by end of document.
            // also block seems to be autoclosed by end of parent
            break;
        }

        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];

        if (pos < max && state.tShift[nextLine] < state.blkIndent) {
            // non-empty line with negative indent should stop the list:
            break;
        }

        if (state.src.slice(pos, max).trim().slice(-close.length) !== close) {
            continue;
        }

        if (state.tShift[nextLine] - state.blkIndent >= 4) {
            // closing block math should be indented less then 4 spaces
            continue;
        }

        lastLinePos = state.src.slice(0, max).lastIndexOf(close);
        lastLine = state.src.slice(pos, lastLinePos);

        pos += lastLine.length + close.length;

        // make sure tail has spaces only
        pos = state.skipSpaces(pos);

        if (pos < max) {
            continue;
        }

        // found!
        haveEndMarker = true;
    }

    // If math block has heading spaces, they should be removed from its inner block
    len = state.tShift[startLine];

    state.line = nextLine + (haveEndMarker ? 1 : 0);

    token = state.push('function_plot', 'function_plot', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
        state.getLines(startLine + 1, nextLine, len, true) +
        (lastLine && lastLine.trim() ? lastLine : '');
    token.info = params;
    token.map = [startLine, state.line];
    token.markup = open;

    return true;
}

module.exports = function function_plot(md, options) {
    var blockRenderer = function(tokens, idx){
        fpJs = tokens[idx].content;
        let id = uuid();
        let options = {};                 
        try{
            options = eval("(" + fpJs + ")");                    
            options.target = `#`+id;

            let scripts = `functionPlot(${JSON.stringify(options)});`

            let html = `<div>
                <span id="${id}"></span>
                <script>${scripts}</script>
            </div>`;
            return html;
        }catch(e){                    
            return "JSON Error: <pre>"+ e+"</pre>";
        } 
    }

    md.block.ruler.before('code', 'function_plot', block);
    md.renderer.rules.function_plot = blockRenderer;
}