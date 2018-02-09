import { TableOperation } from "roosterjs-editor-types";

/**
 * Edit the given TABLE or TD node
 * @param operation Operation to perform
 * @param node The TABLE or TD node. If TABLE node is provided, it will use the first TD as current node
 * @param param Optionial parameter, used by some operation type.
 */
export default function editTableNode(
    operation: TableOperation,
    node: HTMLTableCellElement | HTMLTableElement,
    param?: any
): HTMLTableCellElement {
    let table: HTMLTableElement;
    let td: HTMLTableCellElement;

    if (node instanceof HTMLTableElement && node.rows.length > 0) {
        table = node;
        td = table.rows[0].cells[0];
    } else if (node instanceof HTMLTableCellElement) {
        td = node;
        for (table = <HTMLTableElement><any>td; parent && table.tagName != 'TABLE'; table = <HTMLTableElement>table.parentNode) {}
    }
    if (table && td) {
        let virtualTable = createVirtualTable(table, td);
        internalEditTable(virtualTable, operation, param);
        writeBack(virtualTable);
        return getCurrentTd(virtualTable);
    }
    return null;
}

interface VirtualTableCell {
    td: HTMLTableCellElement;
    spanLeft: boolean;
    spanAbove: boolean;
}

interface VirtualTableRow {
    cells: VirtualTableCell[];
    tr: HTMLTableRowElement;
}

interface VirtualTableStyle {
    className: string;
    bgColorEven: string;
    bgColorOdd: string;
    topBorder: string;
    bottomBorder: string;
    verticalBorder: string;
}

interface VirtualTable {
    rows: VirtualTableRow[];
    table: HTMLTableElement;
    style: VirtualTableStyle;
    row: number;
    col: number;
}

const TABLE_STYLE_CLASS_PREFIX = 'roosterTableStyle';
const TABLE_STYLE_CLASS_MAP: { [name: string]: VirtualTableStyle } = {
    Default: createStyle('Default', '#FFF', '#FFF', '#ABABAB', '#ABABAB', '#ABABAB'),
    LightLines: createStyle('LightLines', '#FFF', '#FFF', null, '#92C0E0'),
    TwoTones: createStyle('TwoTones', '#C0E4FF', '#FFF'),
    LightBands: createStyle('LightBands', '#D8D8D8', '#FFF'),
    Grid: createStyle('Grid', '#D8D8D8', '#FFF', '#ABABAB', '#ABABAB', '#ABABAB'),
    Clear: createStyle('Clear', '#FFF', '#FFF'),
};

// Create virtual table from HTML table
function createVirtualTable(table: HTMLTableElement, currentTd: HTMLTableCellElement): VirtualTable {
    // 1. Create empty v-table
    let vtable = {
        table: table,
        rows: <VirtualTableRow[]>[],
        style: getTableStyle(table),
        row: 0,
        col: 0,
    };

    // 2. Create empty rows
    for (let row = 0; row < table.rows.length; row++) {
        vtable.rows.push(createRow(table.rows[row]));
    }

    // 3. Fill the cells to each row
    for (let row = 0; row < table.rows.length; row++) {
        let tr = table.rows[row];
        for (let sourceColumn = 0, targetColumn = 0; sourceColumn < tr.cells.length; sourceColumn++) {
            // Skip the cells which already initialized
            for (; vtable.rows[row].cells[targetColumn]; targetColumn++) {}

            let td = tr.cells[sourceColumn];
            if (td == currentTd) {
                vtable.col = targetColumn;
                vtable.row = row;
            }

            for (let colSpan = 0; colSpan < td.colSpan; colSpan++, targetColumn++) {
                for (let rowSpan = 0; rowSpan < td.rowSpan; rowSpan++) {
                    vtable.rows[row + rowSpan].cells[targetColumn] = {
                        td: colSpan + rowSpan == 0 ? td : null,
                        spanLeft: colSpan > 0,
                        spanAbove: rowSpan > 0,
                    };
                }
            }
        }
    }

    return vtable;
}

function internalEditTable(vtable: VirtualTable, operation: TableOperation, param: any) {
    let currentRow = vtable.rows[vtable.row];
    let currentCell = currentRow.cells[vtable.col];
    switch (operation) {
        case TableOperation.InsertAbove:
        case TableOperation.InsertBelow:
            let newRow = createRow(cloneNode(currentRow.tr), currentRow.cells.map(cell => cloneCell(cell)));
            vtable.rows.splice(vtable.row + (operation == TableOperation.InsertAbove ? 0 : 1), 0, newRow);
            break;

        case TableOperation.InsertLeft:
        case TableOperation.InsertRight:
            let newCol = vtable.col + (operation == TableOperation.InsertLeft ? 0 : 1);
            forEachRowOfColumn(vtable, vtable.col, (cell, row) => {
                row.cells.splice(newCol, 0, cloneCell(cell))
            });
            break;

        case TableOperation.DeleteRow:
            for (let i = 0; i < currentRow.cells.length; i++) {
                let cell = currentRow.cells[i];
                let nextCell = getCell(vtable, vtable.row + 1, i);
                if (cell.td && cell.td.rowSpan > 1 && nextCell.spanAbove) {
                    nextCell.td = cell.td;
                }
            }
            vtable.rows.splice(vtable.row, 1);
            break;

        case TableOperation.DeleteColumn:
            forEachRowOfColumn(vtable, vtable.col, (cell, row, i) => {
                let nextCell = getCell(vtable, i, vtable.col);
                if (cell.td && cell.td.colSpan > 1 && nextCell.spanLeft) {
                    nextCell.td = cell.td;
                }
                row.cells.splice(vtable.col, 1);
            })
            break;

        case TableOperation.MergeAbove:
        case TableOperation.MergeBelow:
            let rowStep = operation == TableOperation.MergeAbove ? -1 : 1;
            for (
                let rowIndex = vtable.row + rowStep;
                rowIndex >= 0 && rowIndex < vtable.rows.length;
                rowIndex += rowStep
            ) {
                let cell = getCell(vtable, rowIndex, vtable.col);
                if (cell.td && !cell.spanAbove) {
                    let aboveCell = rowIndex < vtable.row ? cell : currentCell;
                    let belowCell = rowIndex < vtable.row ? currentCell : cell;
                    if (aboveCell.td.colSpan == belowCell.td.colSpan) {
                        moveChildren(belowCell.td, aboveCell.td);
                        belowCell.td = null;
                        belowCell.spanAbove = true;
                    }
                    break;
                }
            }
            break;

        case TableOperation.MergeLeft:
        case TableOperation.MergeRight:
            let colStep = operation == TableOperation.MergeLeft ? -1 : 1;
            for (
                let colIndex = vtable.col + colStep;
                colIndex >= 0 && colIndex < vtable.rows[vtable.row].cells.length;
                colIndex += colStep
            ) {
                let cell = getCell(vtable, vtable.row, colIndex);
                if (cell.td && !cell.spanLeft) {
                    let leftCell = colIndex < vtable.col ? cell : currentCell;
                    let rightCell = colIndex < vtable.col ? currentCell : cell;
                    if (leftCell.td.rowSpan == rightCell.td.rowSpan) {
                        moveChildren(rightCell.td, leftCell.td);
                        rightCell.td = null;
                        rightCell.spanLeft = true;
                    }
                    break;
                }
            }
            break;

        case TableOperation.DeleteTable:
            vtable.rows = null;
            break;

        case TableOperation.SplitVertically:
            if (currentCell.td.rowSpan > 1) {
                getCell(vtable, vtable.row + 1, vtable.col).td = cloneNode(currentCell.td);
            } else {
                let splitRow = createRow(cloneNode(currentRow.tr), currentRow.cells.map(cell => {
                    return {
                        td: cell == currentCell ? cloneNode(cell.td) : null,
                        spanAbove: cell != currentCell,
                        spanLeft: cell.spanLeft,
                    };
                }));
                vtable.rows.splice(vtable.row + 1, 0, splitRow);
            }
            break;

        case TableOperation.SplitHorizontally:
            if (currentCell.td.colSpan > 1) {
                getCell(vtable, vtable.row, vtable.col + 1).td = cloneNode(currentCell.td);
            } else {
                forEachRowOfColumn(vtable, vtable.col, (cell, row) => {
                    row.cells.splice(vtable.col + 1, 0, {
                        td: row == currentRow ? cloneNode(cell.td) : null,
                        spanAbove: cell.spanAbove,
                        spanLeft: row != currentRow,
                    });
                });
            }
            break;

        case TableOperation.StyleDefault:
            vtable.style = TABLE_STYLE_CLASS_MAP.Default;
            break;

        case TableOperation.StyleGrid:
            vtable.style = TABLE_STYLE_CLASS_MAP.Grid;
            break;

        case TableOperation.StyleLightLines:
            vtable.style = TABLE_STYLE_CLASS_MAP.LightLines;
            break;

        case TableOperation.StyleTwoTones:
            vtable.style = TABLE_STYLE_CLASS_MAP.TwoTones;
            break;

        case TableOperation.StyleLightBands:
            vtable.style = TABLE_STYLE_CLASS_MAP.LightBands;
            break;

        case TableOperation.StyleClear:
            vtable.style = TABLE_STYLE_CLASS_MAP.Clear;
            break;

        case TableOperation.SetColumnWidth:
            let width = parseInt(param);
            if (!(width >= 0)) {
                width = 0;
            }
            for (let row = 0; row < vtable.rows.length; row++) {
                let cell = getCell(vtable, row, vtable.col);
                if (cell.td) {
                    cell.td.style.width = width + 'px';
                }
            }
            break;
    }
}

function writeBack(vtable: VirtualTable) {
    let table = vtable.table;

    if (vtable.rows) {
        moveChildren(table);
        let existingStyle = getTableStyle(table);
        let newStyle = vtable.style;
        if (newStyle) {
            if (existingStyle) {
                table.className = table.className.replace(existingStyle.className, newStyle.className);
            } else {
                table.className += ' ' + newStyle.className;
            }
            table.style.borderCollapse = 'collapse';
        }
        for (let r = 0; r < vtable.rows.length; r++) {
            let row = vtable.rows[r];
            let tr = row.tr;

            moveChildren(tr);
            if (newStyle) {
                tr.style.backgroundColor = (( r % 2) ? newStyle.bgColorEven : newStyle.bgColorOdd) || 'transparent';
            }
            table.appendChild(tr);
            for (let c = 0; c < row.cells.length; c++) {
                let td = row.cells[c].td;
                if (td) {
                    if (newStyle) {
                        td.style.borderTop = getBorderStyle(newStyle.topBorder);
                        td.style.borderBottom = getBorderStyle(newStyle.bottomBorder);
                        td.style.borderLeft = getBorderStyle(newStyle.verticalBorder);
                        td.style.borderRight = getBorderStyle(newStyle.verticalBorder);
                    }
                    recalcSpans(td, vtable, r, c);
                    tr.appendChild(td);
                }
            }
        }
    } else {
        table.parentNode.removeChild(table);
    }
}

function getBorderStyle(style: string): string {
    return 'solid 1px ' + (style || 'transparent');
}

function getTableStyle(table: HTMLTableElement): VirtualTableStyle {
    let classNames = table.className.split(' ');
    for (let i = 0; i < classNames.length; i++) {
        if (classNames[i].indexOf(TABLE_STYLE_CLASS_PREFIX) == 0) {
            let className = classNames[i].substr(TABLE_STYLE_CLASS_PREFIX.length);
            return TABLE_STYLE_CLASS_MAP[className];
        }
    }
    return null;
}

function recalcSpans(td: HTMLTableCellElement, vtable: VirtualTable, row: number, col: number) {
    td.removeAttribute('colSpan');
    td.removeAttribute('rowSpan');
    for (let i = col + 1; i < vtable.rows[row].cells.length; i++) {
        let cell = getCell(vtable, row, i);
        if (cell.td || !cell.spanLeft) {
            break;
        }
        td.colSpan = i + 1 - col;
    }
    for (let i = row + 1; i < vtable.rows.length; i++) {
        let cell = getCell(vtable, i, col);
        if (cell.td || !cell.spanAbove) {
            break;
        }
        td.rowSpan = i + 1 - row;
    }
}

function getCurrentTd(vtable: VirtualTable): HTMLTableCellElement {
    if (!vtable.rows) {
        return null;
    }
    let row = Math.min(vtable.rows.length - 1, vtable.row);
    let col = Math.min(vtable.rows[row].cells.length - 1, vtable.col);
    while (row >= 0 && col >= 0) {
        let cell = vtable.rows[row].cells[col];
        if (cell.td) {
            return cell.td;
        } else if (cell.spanLeft) {
            col--;
        } else if (cell.spanAbove) {
            row--;
        } else {
            break;
        }
    }

    return null;
}

function getCell(vtable: VirtualTable, row: number, col: number): VirtualTableCell {
    return row < vtable.rows.length && col < vtable.rows[row].cells.length ? vtable.rows[row].cells[col] : {
        td: null,
        spanLeft: false,
        spanAbove: false,
    };
}

function cloneNode<T extends Node>(node: T): T {
    let newNode = node ? <T>node.cloneNode(false /*deep*/) : null;
    if (newNode && !newNode.firstChild) {
        newNode.appendChild(node.ownerDocument.createElement('br'));
    }
    return newNode;
}

function cloneCell(cell: VirtualTableCell): VirtualTableCell {
    return {
        td: cloneNode(cell.td),
        spanAbove: cell.spanAbove,
        spanLeft: cell.spanLeft,
    };
}

function createRow(tr: HTMLTableRowElement, cells?: VirtualTableCell[]): VirtualTableRow {
    return {
        cells: cells || [],
        tr: tr,
    };
}

function moveChildren(fromNode: Node, toNode?: Node) {
    while (fromNode.firstChild) {
        if (toNode) {
            toNode.appendChild(fromNode.firstChild);
        } else {
            fromNode.removeChild(fromNode.firstChild);
        }
    }
}

function createStyle(
    name: string,
    bgColorEven?: string,
    bgColorOdd?: string,
    topBorder?: string,
    bottomBorder?: string,
    verticalBorder?: string
): VirtualTableStyle {
    return {
        className: TABLE_STYLE_CLASS_PREFIX + name,
        bgColorEven: bgColorEven,
        bgColorOdd: bgColorOdd,
        topBorder: topBorder,
        bottomBorder: bottomBorder,
        verticalBorder: verticalBorder,
    };
}

function forEachRowOfColumn(
    vtable: VirtualTable,
    col: number,
    callback: (cell: VirtualTableCell, row: VirtualTableRow, i: number) => void
) {
    for (let i = 0; i < vtable.rows.length; i++) {
        callback(getCell(vtable, i, col), vtable.rows[i], i);
    }
}

