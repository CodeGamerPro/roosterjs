import { Editor, EditorPlugin } from 'roosterjs-editor-core';
import { fromHtml } from 'roosterjs-editor-dom';
import { getNodeAtCursor, editTableWithParam } from 'roosterjs-editor-api';
import { TableOperation } from 'roosterjs-editor-types';

const TABLE_RESIZE_HANDLE_KEY = 'TABLE_RESIZE_HANDLE';
const CONTAINER_HTML = '<div style="position: absolute; cursor: col-resize; width: 6px; background-color: transparent; border: solid 0 #C6C6C6;"></div>';

export default class TableResize implements EditorPlugin {
    private editor: Editor;
    private onMouseOverDisposer: () => void;
    private moving: boolean;
    private pageX: number;
    private startLeft: number;
    private left: number;
    private top: number;
    private height: number;
    private table: HTMLTableElement;
    private td: HTMLTableCellElement;

    // constructor(private isRtl?: boolean) {}

    initialize(editor: Editor) {
        this.editor = editor;
        this.onMouseOverDisposer = this.editor.addDomEventHandler('mouseover', this.onMouseOver)
    }

    dispose() {
        this.editor = null;
        if (this.onMouseOverDisposer) {
            this.onMouseOverDisposer();
            this.onMouseOverDisposer = null;
        }
    }

    private onMouseOver = (e: MouseEvent) => {
        let node = <HTMLElement>e.srcElement;
        if (!this.moving && node.tagName == 'TD') {
            this.td = <HTMLTableCellElement>node;
            this.calcAndShowHandle();
        }
    }

    private calcAndShowHandle() {
        let tr = <HTMLTableRowElement>getNodeAtCursor(this.editor, 'TR', this.td);
        this.table = <HTMLTableElement>getNodeAtCursor(this.editor, 'TABLE', tr);
        if (tr && this.table) {
            let width = 0;
            for (let i = 0; i < tr.cells.length; i++) {
                width += tr.cells[i].offsetWidth;
                if (tr.cells[i] == this.td) {
                    break;
                }
            }

            let [left, top] = this.getPosition(this.table);
            this.startLeft = left + width - 6;
            this.left = this.startLeft;
            this.top = top;
            this.height = this.table.offsetHeight;
            this.showHandle();
        }
    }

    private showHandle() {
        let handle = this.getResizeHandle();
        handle.style.left = this.left + 'px';
        handle.style.top = this.top + 'px';
        handle.style.height = this.height + 'px';
    }

    private getPosition(element: HTMLElement): [number, number] {
        let parent = <HTMLElement>element.offsetParent;
        let [left, top] = parent ? this.getPosition(parent) : [0, 0];
        return [left + element.offsetLeft, top + element.offsetTop];
    }

    private getResizeHandle() {
        return this.editor.getCustomData(TABLE_RESIZE_HANDLE_KEY, () => {
            let document =  this.editor.getDocument();
            let handle = fromHtml(CONTAINER_HTML, document)[0] as HTMLElement;
            document.body.appendChild(handle);
            handle.addEventListener('mousedown', this.onMouseDown);
            return handle;
        }, handle => {
            handle.removeEventListener('mousedown', this.onMouseDown);
            handle.parentNode.removeChild(handle);
        });
    }

    private onMouseDown = (e: MouseEvent) => {
        this.moving = true;
        this.pageX = e.pageX;
        let document = this.editor.getDocument();

        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('mouseup', this.onMouseUp, true);

        let handle = this.getResizeHandle();
        handle.style.borderWidth = '0 1px';
    }

    private onMouseMove = (e: MouseEvent) => {
        this.left += e.pageX - this.pageX;
        this.pageX = e.pageX;
        this.showHandle();
        e.preventDefault();
        e.stopPropagation();
    }

    private onMouseUp = () => {
        this.moving = false;
        let document = this.editor.getDocument();
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('mouseup', this.onMouseUp, true);

        let handle = this.getResizeHandle();
        handle.style.borderWidth = '0';

        editTableWithParam(TableOperation.SetColumnWidth, this.table, this.td, this.td.offsetWidth + this.left - this.startLeft);
        this.calcAndShowHandle();
    }
}