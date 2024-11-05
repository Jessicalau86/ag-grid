import type { HorizontalDirection } from '../../../constants/direction';
import { BeanStub } from '../../../context/beanStub';
import type { DragSource } from '../../../dragAndDrop/dragAndDropService';
import type { AgColumn } from '../../../entities/agColumn';
import type { AgColumnGroup } from '../../../entities/agColumnGroup';
import type { AgProvidedColumnGroup } from '../../../entities/agProvidedColumnGroup';
import type { SuppressHeaderKeyboardEventParams } from '../../../entities/colDef';
import { _getActiveDomElement, _getDocument, _setDomData } from '../../../gridOptionsUtils';
import type { BrandedType } from '../../../interfaces/brandedType';
import { _requestAnimationFrame } from '../../../misc/animationFrameService';
import { _setAriaColIndex } from '../../../utils/aria';
import { _addOrRemoveAttribute, _getElementSize, _observeResize } from '../../../utils/dom';
import { _isHeaderFocusSuppressed } from '../../../utils/focus';
import { _exists } from '../../../utils/generic';
import { KeyCode } from '../.././../constants/keyCode';
import type { HeaderRowCtrl } from '../../row/headerRowCtrl';
import { refreshFirstAndLastStyles } from '../cssClassApplier';

let instanceIdSequence = 0;

export interface IAbstractHeaderCellComp {
    addOrRemoveCssClass(cssClassName: string, on: boolean): void;
}

export interface IHeaderResizeFeature {
    toggleColumnResizing(resizing: boolean): void;
}

export type HeaderCellCtrlInstanceId = BrandedType<string, 'HeaderCellCtrlInstanceId'>;

export const DOM_DATA_KEY_HEADER_CTRL = 'headerCtrl';

export abstract class AbstractHeaderCellCtrl<
    TComp extends IAbstractHeaderCellComp = any,
    TColumn extends AgColumn | AgColumnGroup = any,
    TFeature extends IHeaderResizeFeature = any,
> extends BeanStub {
    public readonly instanceId: HeaderCellCtrlInstanceId;

    private isResizing: boolean;
    private resizeToggleTimeout = 0;
    protected resizeMultiplier = 1;

    public eGui: HTMLElement;
    protected resizeFeature: TFeature | null = null;
    protected comp: TComp;

    public lastFocusEvent: KeyboardEvent | null = null;

    protected dragSource: DragSource | null = null;

    protected abstract resizeHeader(delta: number, shiftKey: boolean): void;

    constructor(
        public readonly column: TColumn,
        public readonly rowCtrl: HeaderRowCtrl
    ) {
        super();

        // unique id to this instance, including the column ID to help with debugging in React as it's used in 'key'
        this.instanceId = (column.getUniqueId() + '-' + instanceIdSequence++) as HeaderCellCtrlInstanceId;
    }

    public postConstruct(): void {
        const refreshTabIndex = this.refreshTabIndex.bind(this);
        this.addManagedPropertyListeners(['suppressHeaderFocus'], refreshTabIndex);
        this.addManagedEventListeners({
            overlayExclusiveChanged: refreshTabIndex,
        });
    }

    protected shouldStopEventPropagation(event: KeyboardEvent): boolean {
        const { headerRowIndex, column } = this.beans.focusSvc.getFocusedHeader()!;

        const colDef = column.getDefinition();
        const colDefFunc = colDef && colDef.suppressHeaderKeyboardEvent;

        if (!_exists(colDefFunc)) {
            return false;
        }

        const params: SuppressHeaderKeyboardEventParams = this.gos.addGridCommonParams({
            colDef: colDef,
            column,
            headerRowIndex,
            event,
        });

        return !!colDefFunc(params);
    }

    protected getWrapperHasFocus(): boolean {
        const activeEl = _getActiveDomElement(this.beans);

        return activeEl === this.eGui;
    }

    protected setGui(eGui: HTMLElement, compBean: BeanStub): void {
        this.eGui = eGui;
        this.addDomData(compBean);
        compBean.addManagedListeners(this.beans.eventSvc, {
            displayedColumnsChanged: this.onDisplayedColumnsChanged.bind(this),
        });

        compBean.addManagedElementListeners(this.eGui, {
            focus: this.onGuiFocus.bind(this),
        });

        this.onDisplayedColumnsChanged();
        this.refreshTabIndex();
    }

    private onGuiFocus(): void {
        this.eventSvc.dispatchEvent({
            type: 'headerFocused',
            column: this.column,
        });
    }

    protected setupAutoHeight(params: {
        wrapperElement: HTMLElement;
        checkMeasuringCallback?: (callback: () => void) => void;
        compBean: BeanStub;
    }) {
        const { wrapperElement, checkMeasuringCallback, compBean } = params;
        const { beans } = this;
        const measureHeight = (timesCalled: number) => {
            if (!this.isAlive() || !compBean.isAlive()) {
                return;
            }

            const { paddingTop, paddingBottom, borderBottomWidth, borderTopWidth } = _getElementSize(this.eGui);
            const extraHeight = paddingTop + paddingBottom + borderBottomWidth + borderTopWidth;

            const wrapperHeight = wrapperElement.offsetHeight;
            const autoHeight = wrapperHeight + extraHeight;

            if (timesCalled < 5) {
                // if not in doc yet, means framework not yet inserted, so wait for next VM turn,
                // maybe it will be ready next VM turn
                const doc = _getDocument(beans);
                const notYetInDom = !doc || !doc.contains(wrapperElement);

                // this happens in React, where React hasn't put any content in. we say 'possibly'
                // as a) may not be React and b) the cell could be empty anyway
                const possiblyNoContentYet = autoHeight == 0;

                if (notYetInDom || possiblyNoContentYet) {
                    _requestAnimationFrame(beans, () => measureHeight(timesCalled + 1));
                    return;
                }
            }

            this.setColHeaderHeight(this.column, autoHeight);
        };

        let isMeasuring = false;
        let stopResizeObserver: (() => void) | undefined;

        const checkMeasuring = () => {
            const newValue = this.column.isAutoHeaderHeight();

            if (newValue && !isMeasuring) {
                startMeasuring();
            }
            if (!newValue && isMeasuring) {
                stopMeasuring();
            }
        };

        const startMeasuring = () => {
            isMeasuring = true;
            measureHeight(0);
            this.comp.addOrRemoveCssClass('ag-header-cell-auto-height', true);
            stopResizeObserver = _observeResize(this.beans, wrapperElement, () => measureHeight(0));
        };

        const stopMeasuring = () => {
            isMeasuring = false;
            if (stopResizeObserver) {
                stopResizeObserver();
            }
            this.comp.addOrRemoveCssClass('ag-header-cell-auto-height', false);
            stopResizeObserver = undefined;
        };

        checkMeasuring();

        compBean.addDestroyFunc(() => stopMeasuring());

        // In theory we could rely on the resize observer for everything - but since it's debounced
        // it can be a little janky for smooth movement. in this case its better to react to our own events
        // And unfortunately we cant _just_ rely on our own events, since custom components can change whenever
        compBean.addManagedListeners(this.column, { widthChanged: () => isMeasuring && measureHeight(0) });
        // Displaying the sort icon changes the available area for text, so sort changes can affect height
        compBean.addManagedEventListeners({
            sortChanged: () => {
                // Rendering changes for sort, happen after the event... not ideal
                if (isMeasuring) {
                    window.setTimeout(() => measureHeight(0));
                }
            },
        });

        if (checkMeasuringCallback) {
            checkMeasuringCallback(checkMeasuring);
        }
    }

    protected onDisplayedColumnsChanged(): void {
        const { comp, column, beans, eGui } = this;
        if (!comp || !column || !eGui) {
            return;
        }
        refreshFirstAndLastStyles(comp, column, beans.visibleCols);
        _setAriaColIndex(eGui, beans.visibleCols.getAriaColIndex(column)); // for react, we don't use JSX, as it slowed down column moving
    }

    protected addResizeAndMoveKeyboardListeners(compBean: BeanStub): void {
        if (!this.resizeFeature) {
            return;
        }

        compBean.addManagedListeners(this.eGui, {
            keydown: this.onGuiKeyDown.bind(this),
            keyup: this.onGuiKeyUp.bind(this),
        });
    }

    private refreshTabIndex(): void {
        const suppressHeaderFocus = _isHeaderFocusSuppressed(this.beans);
        if (this.eGui) {
            _addOrRemoveAttribute(this.eGui, 'tabindex', suppressHeaderFocus ? null : '-1');
        }
    }

    private onGuiKeyDown(e: KeyboardEvent): void {
        const activeEl = _getActiveDomElement(this.beans);

        const isLeftOrRight = e.key === KeyCode.LEFT || e.key === KeyCode.RIGHT;

        if (this.isResizing) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }

        if (
            // if elements within the header are focused, we don't process the event
            activeEl !== this.eGui ||
            // if shiftKey and altKey are not pressed, it's cell navigation so we don't process the event
            (!e.shiftKey && !e.altKey)
        ) {
            return;
        }

        if (this.isResizing || isLeftOrRight) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }

        if (!isLeftOrRight) {
            return;
        }

        const isLeft = (e.key === KeyCode.LEFT) !== this.gos.get('enableRtl');
        const direction = isLeft ? 'left' : 'right';

        if (e.altKey) {
            this.isResizing = true;
            this.resizeMultiplier += 1;
            const diff = this.getViewportAdjustedResizeDiff(e);
            this.resizeHeader(diff, e.shiftKey);
            this.resizeFeature?.toggleColumnResizing(true);
        } else {
            this.moveHeader(direction);
        }
    }

    protected moveHeader(hDirection: HorizontalDirection): void {
        this.beans.colMoves?.moveHeader(hDirection, this.eGui, this.column, this.rowCtrl.pinned, this);
    }

    private getViewportAdjustedResizeDiff(e: KeyboardEvent): number {
        const diff = this.getResizeDiff(e);
        const { pinnedCols } = this.beans;
        return pinnedCols ? pinnedCols.getHeaderResizeDiff(diff, this.column) : diff;
    }

    private getResizeDiff(e: KeyboardEvent): number {
        let isLeft = (e.key === KeyCode.LEFT) !== this.gos.get('enableRtl');

        const pinned = this.column.getPinned();
        const isRtl = this.gos.get('enableRtl');
        if (pinned) {
            if (isRtl !== (pinned === 'right')) {
                isLeft = !isLeft;
            }
        }

        return (isLeft ? -1 : 1) * this.resizeMultiplier;
    }

    private onGuiKeyUp(): void {
        if (!this.isResizing) {
            return;
        }
        if (this.resizeToggleTimeout) {
            window.clearTimeout(this.resizeToggleTimeout);
            this.resizeToggleTimeout = 0;
        }

        this.isResizing = false;
        this.resizeMultiplier = 1;

        this.resizeToggleTimeout = window.setTimeout(() => {
            this.resizeFeature?.toggleColumnResizing(false);
        }, 150);
    }

    protected handleKeyDown(e: KeyboardEvent): void {
        const wrapperHasFocus = this.getWrapperHasFocus();

        switch (e.key) {
            case KeyCode.PAGE_DOWN:
            case KeyCode.PAGE_UP:
            case KeyCode.PAGE_HOME:
            case KeyCode.PAGE_END:
                if (wrapperHasFocus) {
                    e.preventDefault();
                }
        }
    }

    private addDomData(compBean: BeanStub): void {
        const key = DOM_DATA_KEY_HEADER_CTRL;
        _setDomData(this.gos, this.eGui, key, this);
        compBean.addDestroyFunc(() => _setDomData(this.gos, this.eGui, key, null));
    }

    public focus(event?: KeyboardEvent): boolean {
        if (!this.eGui) {
            return false;
        }

        this.lastFocusEvent = event || null;
        this.eGui.focus();
        return true;
    }

    protected focusThis(): void {
        this.beans.focusSvc.setFocusedHeader(this.rowCtrl.rowIndex, this.column);
    }

    protected removeDragSource(): void {
        if (this.dragSource) {
            this.beans.dragAndDrop?.removeDragSource(this.dragSource);
            this.dragSource = null;
        }
    }

    protected handleContextMenuMouseEvent(
        mouseEvent: MouseEvent | undefined,
        touchEvent: TouchEvent | undefined,
        column: AgColumn | AgProvidedColumnGroup
    ): void {
        const event = mouseEvent ?? touchEvent!;
        if (this.gos.get('preventDefaultOnContextMenu')) {
            event.preventDefault();
        }
        const { menuSvc } = this.beans;
        if (menuSvc?.isHeaderContextMenuEnabled(column)) {
            menuSvc.showHeaderContextMenu(column, mouseEvent, touchEvent);
        }

        this.dispatchColumnMouseEvent('columnHeaderContextMenu', column);
    }

    protected dispatchColumnMouseEvent(
        eventType: 'columnHeaderContextMenu' | 'columnHeaderClicked',
        column: AgColumn | AgProvidedColumnGroup
    ): void {
        this.eventSvc.dispatchEvent({
            type: eventType,
            column,
        });
    }

    private setColHeaderHeight(col: AgColumn | AgColumnGroup, height: number): void {
        if (!col.setAutoHeaderHeight(height)) {
            return;
        }
        if (col.isColumn) {
            this.eventSvc.dispatchEvent({
                type: 'columnHeaderHeightChanged',
                column: col,
                columns: [col],
                source: 'autosizeColumnHeaderHeight',
            });
        } else {
            this.eventSvc.dispatchEvent({
                type: 'columnGroupHeaderHeightChanged',
                columnGroup: col,
                source: 'autosizeColumnGroupHeaderHeight',
            });
        }
    }

    protected clearComponent(): void {
        this.removeDragSource();
        (this.resizeFeature as any) = null;
        (this.comp as any) = null;
        (this.eGui as any) = null;
    }

    public override destroy(): void {
        super.destroy();

        (this.column as any) = null;
        (this.lastFocusEvent as any) = null;
        (this.rowCtrl as any) = null;
    }
}
