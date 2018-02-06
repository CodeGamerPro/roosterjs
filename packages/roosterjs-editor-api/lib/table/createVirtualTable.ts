export interface VirtualTableCell {
    node: Node;
}

export interface VirtualTableRow {
    cells: VirtualTableCell[];
}

export interface VirtualTable {
    rows: VirtualTableRow[];
}

export default function createVirtualTable(table: HTMLTableElement): VirtualTable {
    let virtualTable = { rows: <VirtualTableRow[]>[] };

    for (let r = 0; r < table.rows.length; r++) {
        virtualTable.rows.push({ cells: <VirtualTableCell[]>[] });
    }

    for (let r = 0; r < table.rows.length; r++) {
        let tr = table.rows[r];
        let targetIndex = 0;
        for (let c = 0; c < tr.cells.length; c++) {
            let td = tr.cells[c];
            for (; virtualTable.rows[r].cells[targetIndex]; targetIndex++);

            for (let i = 0; i < td.colSpan; i++, targetIndex++) {
                for (let j = 0; j < td.rowSpan; j++) {
                    virtualTable.rows[r + j].cells[targetIndex] = {
                        node: (i == 0 && j == 0) ? td : null,
                    };
                }
            }
        }
    }

    return virtualTable
}