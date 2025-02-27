import type {
    BeanCollection,
    ColDef,
    ColKey,
    ColumnEventType,
    ColumnGroupService,
    ColumnModel,
    ColumnNameService,
    IAutoColService,
    IColsService,
    NamedBean,
    _ColumnCollections,
} from 'ag-grid-community';
import {
    AgColumn,
    AgProvidedColumnGroup,
    BeanStub,
    GROUP_AUTO_COLUMN_ID,
    _addColumnDefaultAndTypes,
    _areColIdsEqual,
    _columnsMatch,
    _convertColumnEventSourceType,
    _destroyColumnTree,
    _isColumnsSortingCoupledToGroup,
    _isGroupMultiAutoColumn,
    _isGroupUseEntireRow,
    _mergeDeep,
    _missing,
    _updateColsMap,
    _updateColumnState,
    _warn,
    isColumnGroupAutoCol,
} from 'ag-grid-community';

export class AutoColService extends BeanStub implements NamedBean, IAutoColService {
    beanName = 'autoColSvc' as const;

    private colModel: ColumnModel;
    private colNames: ColumnNameService;
    private rowGroupColsSvc?: IColsService;
    private colGroupSvc?: ColumnGroupService;

    // group auto columns
    public autoCols: _ColumnCollections | null;

    public wireBeans(beans: BeanCollection): void {
        this.colModel = beans.colModel;
        this.colNames = beans.colNames;
        this.rowGroupColsSvc = beans.rowGroupColsSvc;
        this.colGroupSvc = beans.colGroupSvc;
    }

    public postConstruct(): void {
        this.addManagedPropertyListener('autoGroupColumnDef', (event) =>
            this.onAutoGroupColumnDefChanged(_convertColumnEventSourceType(event.source))
        );
    }

    public addAutoCols(cols: _ColumnCollections): void {
        if (this.autoCols == null) {
            return;
        }
        cols.list = this.autoCols.list.concat(cols.list);
        cols.tree = this.autoCols.tree.concat(cols.tree);
        _updateColsMap(cols);
    }

    public createAutoCols(
        cols: _ColumnCollections,
        updateOrders: (callback: (cols: AgColumn[] | null) => AgColumn[] | null) => void
    ): void {
        const isPivotMode = this.colModel.isPivotMode();
        const groupFullWidthRow = _isGroupUseEntireRow(this.gos, isPivotMode);
        // we need to allow suppressing auto-column separately for group and pivot as the normal situation
        // is CSRM and user provides group column themselves for normal view, but when they go into pivot the
        // columns are generated by the grid so no opportunity for user to provide group column. so need a way
        // to suppress auto-col for grouping only, and not pivot.
        // however if using Viewport RM or SSRM and user is providing the columns, the user may wish full control
        // of the group column in this instance.
        const suppressAutoColumn = isPivotMode ? this.gos.get('pivotSuppressAutoColumn') : this.isSuppressAutoCol();

        const rowGroupCols = this.rowGroupColsSvc?.columns;

        const groupingActive = (rowGroupCols && rowGroupCols.length > 0) || this.gos.get('treeData');

        const noAutoCols = !groupingActive || suppressAutoColumn || groupFullWidthRow;

        const destroyPrevious = () => {
            if (this.autoCols) {
                _destroyColumnTree(this.beans, this.autoCols.tree);
                this.autoCols = null;
            }
        };

        // function
        if (noAutoCols) {
            destroyPrevious();
            return;
        }

        const list = this.generateAutoCols(rowGroupCols);
        const autoColsSame = _areColIdsEqual(list, this.autoCols?.list || null);

        // the new tree dept will equal the current tree dept of cols
        const newTreeDepth = cols.treeDepth;
        const oldTreeDepth = this.autoCols ? this.autoCols.treeDepth : -1;
        const treeDeptSame = oldTreeDepth == newTreeDepth;

        if (autoColsSame && treeDeptSame) {
            return;
        }

        destroyPrevious();
        const treeDepth = this.colGroupSvc?.findDepth(cols.tree) ?? 0;
        const tree = this.balanceTreeForAutoCols(list, treeDepth);
        this.autoCols = {
            list,
            tree,
            treeDepth,
            map: {},
        };

        const putAutoColsFirstInList = (cols: AgColumn[] | null): AgColumn[] | null => {
            if (!cols) {
                return null;
            }
            // we use colId, and not instance, to remove old autoGroupCols
            const colsFiltered = cols.filter((col) => !isColumnGroupAutoCol(col));
            return [...list, ...colsFiltered];
        };

        updateOrders(putAutoColsFirstInList);
    }

    /**
     * Inserts dummy group columns in the hierarchy above auto-generated columns
     * in order to ensure auto-generated columns are leaf nodes (and therefore are
     * displayed correctly)
     */
    public balanceTreeForAutoCols(autoCols: AgColumn[], depth: number): (AgColumn | AgProvidedColumnGroup)[] {
        const tree: (AgColumn | AgProvidedColumnGroup)[] = [];

        autoCols.forEach((col) => {
            // at the end, this will be the top of the tree item.
            let nextChild: AgColumn | AgProvidedColumnGroup = col;

            for (let i = depth - 1; i >= 0; i--) {
                const autoGroup = new AgProvidedColumnGroup(null, `FAKE_PATH_${col.getId()}}_${i}`, true, i);
                this.createBean(autoGroup);
                autoGroup.setChildren([nextChild]);
                nextChild.originalParent = autoGroup;
                nextChild = autoGroup;
            }

            if (depth === 0) {
                col.originalParent = null;
            }

            // at this point, the nextChild is the top most item in the tree
            tree.push(nextChild);
        });

        return tree;
    }

    public getAutoCol(key: ColKey): AgColumn | null {
        return this.autoCols?.list.find((groupCol) => _columnsMatch(groupCol, key)) ?? null;
    }

    public getAutoCols(): AgColumn[] | null {
        return this.autoCols?.list ?? null;
    }

    private generateAutoCols(rowGroupCols: AgColumn[] = []): AgColumn[] {
        const autoCols: AgColumn[] = [];

        const doingTreeData = this.gos.get('treeData');
        let doingMultiAutoColumn = _isGroupMultiAutoColumn(this.gos);

        if (doingTreeData && doingMultiAutoColumn) {
            _warn(182);
            doingMultiAutoColumn = false;
        }

        // if doing groupDisplayType = "multipleColumns", then we call the method multiple times, once
        // for each column we are grouping by
        if (doingMultiAutoColumn) {
            rowGroupCols.forEach((rowGroupCol, index) => {
                autoCols.push(this.createOneAutoCol(rowGroupCol, index));
            });
        } else {
            autoCols.push(this.createOneAutoCol());
        }

        return autoCols;
    }

    public updateAutoCols(source: ColumnEventType) {
        if (this.autoCols) {
            this.autoCols.list.forEach((col, index) => this.updateOneAutoCol(col, index, source));
        }
    }

    private isSuppressAutoCol() {
        const groupDisplayType = this.gos.get('groupDisplayType');
        const isCustomRowGroups = groupDisplayType === 'custom';
        if (isCustomRowGroups) {
            return true;
        }

        const treeDataDisplayType = this.gos.get('treeDataDisplayType');
        return treeDataDisplayType === 'custom';
    }

    // rowGroupCol and index are missing if groupDisplayType != "multipleColumns"
    private createOneAutoCol(rowGroupCol?: AgColumn, index?: number): AgColumn {
        // if doing multi, set the field
        let colId: string;
        if (rowGroupCol) {
            colId = `${GROUP_AUTO_COLUMN_ID}-${rowGroupCol.getId()}`;
        } else {
            colId = GROUP_AUTO_COLUMN_ID;
        }

        const colDef = this.createAutoColDef(colId, rowGroupCol, index);
        colDef.colId = colId;

        const newCol = new AgColumn(colDef, null, colId, true);
        this.createBean(newCol);
        return newCol;
    }

    /**
     * Refreshes an auto group col to load changes from defaultColDef or autoGroupColDef
     */
    private updateOneAutoCol(colToUpdate: AgColumn, index: number, source: ColumnEventType) {
        const oldColDef = colToUpdate.getColDef();
        const underlyingColId = typeof oldColDef.showRowGroup == 'string' ? oldColDef.showRowGroup : undefined;
        const underlyingColumn = underlyingColId != null ? this.colModel.getColDefCol(underlyingColId) : undefined;
        const colDef = this.createAutoColDef(colToUpdate.getId(), underlyingColumn ?? undefined, index);

        colToUpdate.setColDef(colDef, null, source);
        _updateColumnState(this.beans, colToUpdate, colDef, source);
    }

    private createAutoColDef(colId: string, underlyingColumn?: AgColumn, index?: number): ColDef {
        // if one provided by user, use it, otherwise create one
        let res: ColDef = this.createBaseColDef(underlyingColumn);

        const autoGroupColumnDef = this.gos.get('autoGroupColumnDef');
        _mergeDeep(res, autoGroupColumnDef);

        res = _addColumnDefaultAndTypes(this.beans, res, colId);

        // For tree data the filter is always allowed
        if (!this.gos.get('treeData')) {
            // we would only allow filter if the user has provided field or value getter. otherwise the filter
            // would not be able to work.
            const noFieldOrValueGetter =
                _missing(res.field) &&
                _missing(res.valueGetter) &&
                _missing(res.filterValueGetter) &&
                res.filter !== 'agGroupColumnFilter';
            if (noFieldOrValueGetter) {
                res.filter = false;
            }
        }

        // if showing many cols, we don't want to show more than one with a checkbox for selection
        if (index && index > 0) {
            res.headerCheckboxSelection = false;
        }

        const isSortingCoupled = _isColumnsSortingCoupledToGroup(this.gos);
        const hasOwnData = res.valueGetter || res.field != null;
        if (isSortingCoupled && !hasOwnData) {
            // if col is coupled sorting, and has sort attribute, we want to ignore this
            // because we only accept the sort on creation of the col
            res.sortIndex = undefined;
            res.initialSort = undefined;
        }

        return res;
    }

    private createBaseColDef(rowGroupCol?: AgColumn): ColDef {
        const userDef = this.gos.get('autoGroupColumnDef');
        const localeTextFunc = this.getLocaleTextFunc();

        const res: ColDef = {
            headerName: localeTextFunc('group', 'Group'),
        };

        const userHasProvidedGroupCellRenderer = userDef && (userDef.cellRenderer || userDef.cellRendererSelector);

        // only add the default group cell renderer if user hasn't provided one
        if (!userHasProvidedGroupCellRenderer) {
            res.cellRenderer = 'agGroupCellRenderer';
        }

        if (rowGroupCol) {
            const colDef = rowGroupCol.getColDef();
            Object.assign(res, {
                headerName: this.colNames.getDisplayNameForColumn(rowGroupCol, 'header'),
                headerValueGetter: colDef.headerValueGetter,
            });

            if (colDef.cellRenderer) {
                Object.assign(res, {
                    cellRendererParams: {
                        innerRenderer: colDef.cellRenderer,
                        innerRendererParams: colDef.cellRendererParams,
                    },
                });
            }
            res.showRowGroup = rowGroupCol.getColId();
        } else {
            res.showRowGroup = true;
        }

        return res;
    }

    private onAutoGroupColumnDefChanged(source: ColumnEventType) {
        this.updateAutoCols(source);
    }

    public override destroy(): void {
        _destroyColumnTree(this.beans, this.autoCols?.tree);
        super.destroy();
    }
}
