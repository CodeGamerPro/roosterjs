import VirtualTable, { VirtualTableCell } from './VirtualTable';

export default function virtualTableToTable(vTable: VirtualTable): HTMLTableElement {
    let table = vTable.table;
    if (table) {
        removeChildren(table);
        for (let r = 0; r < vTable.rows.length; r++) {
            let row = vTable.rows[r];
            let tr = row.tr;
            removeChildren(tr);
            table.appendChild(tr);
            for (let c = 0; c < row.cells.length; c++) {
                let cell = row.cells[c];
                if (cell instanceof HTMLTableCellElement) {
                    recalcSpans(<HTMLTableCellElement>cell, vTable, r, c);
                    tr.appendChild(<HTMLTableCellElement>cell);
                }
            }
        }
    }

    return table;
}

function recalcSpans(td: HTMLTableCellElement, vTable: VirtualTable, r: number, c: number) {
    td.removeAttribute('colSpan');
    td.removeAttribute('rowSpan');
    for (
        let i = c + 1;
        i < vTable.rows[r].cells.length && (<VirtualTableCell>vTable.rows[r].cells[i]).spanLeft;
        td.colSpan = ++i - c
    ) {}
    for (
        let i = r + 1;
        i < vTable.rows.length && (<VirtualTableCell>vTable.rows[i].cells[c]).spanAbove;
        td.rowSpan = ++i - r
    ) {}
}

function removeChildren(node: Node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}