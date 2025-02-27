export const modules = {
    groups: [
        {
            moduleName: 'AllCommunityModule',
            name: 'All Community Features',
        },
        {
            moduleName: 'AllEnterpriseModule',
            name: 'All Enterprise Features',
        },
        {
            moduleName: 'ValidationModule',
            name: 'Validation (Dev Mode)',
        },
        {
            moduleName: 'SparklinesModule',
            name: 'Sparklines',
            isEnterprise: true,
        },
        {
            moduleName: 'IntegratedChartsModule',
            name: 'Integrated Charts',
            isEnterprise: true,
        },
        {
            name: 'Columns',
            children: [
                {
                    moduleName: 'ColumnAutoSizeModule',
                    name: 'Column Auto-Sizing',
                },
                {
                    moduleName: 'ColumnHoverModule',
                    name: 'Column Hover',
                },
            ],
        },
        {
            name: 'Rows',
            children: [
                {
                    moduleName: 'PinnedRowModule',
                    name: 'Row Pinning',
                },
                {
                    moduleName: 'RowAutoHeightModule',
                    name: 'Auto Row Height',
                },
                {
                    moduleName: 'RowStyleModule',
                    name: 'Styling Rows',
                },
                {
                    moduleName: 'PaginationModule',
                    name: 'Row Pagination',
                },
                {
                    moduleName: 'RowDragModule',
                    name: 'Row Dragging',
                },
            ],
        },
        {
            name: 'Cells',
            children: [
                {
                    moduleName: 'CellStyleModule',
                    name: 'Styling Cells',
                },
                {
                    moduleName: 'HighlightChangesModule',
                    name: 'Highlighting Changes',
                },
                {
                    moduleName: 'TooltipModule',
                    name: 'Tooltips',
                },
            ],
        },
        {
            name: 'Filtering',
            children: [
                {
                    name: 'Column Filters',
                    children: [
                        {
                            moduleName: 'TextFilterModule',
                            name: 'Text Filter',
                        },
                        {
                            moduleName: 'NumberFilterModule',
                            name: 'Number Filter',
                        },
                        {
                            moduleName: 'DateFilterModule',
                            name: 'Date Filter',
                        },
                        {
                            moduleName: 'SetFilterModule',
                            name: 'Set Filter',
                            isEnterprise: true,
                        },
                        {
                            moduleName: 'MultiFilterModule',
                            name: 'Multi Filter',
                            isEnterprise: true,
                        },
                        {
                            moduleName: 'CustomFilterModule',
                            name: 'Custom Column Filters',
                        },
                    ],
                },
                {
                    moduleName: 'AdvancedFilterModule',
                    name: 'Advanced Filter',
                    isEnterprise: true,
                },
                {
                    moduleName: 'ExternalFilterModule',
                    name: 'External Filter',
                },
                {
                    moduleName: 'QuickFilterModule',
                    name: 'Quick Filter',
                },
            ],
        },
        {
            name: 'Selection',
            children: [
                {
                    moduleName: 'RowSelectionModule',
                    name: 'Row Selection',
                },
                {
                    moduleName: 'CellSelectionModule',
                    name: 'Cell Selection',
                    isEnterprise: true,
                },
            ],
        },
        {
            name: 'Editing',
            children: [
                {
                    name: 'Provided Cell Editors',
                    children: [
                        {
                            moduleName: 'TextEditorModule',
                            name: 'Text Editor',
                        },
                        {
                            moduleName: 'LargeTextEditorModule',
                            name: 'Large Text Editor',
                        },
                        {
                            moduleName: 'SelectEditorModule',
                            name: 'Select Editor',
                        },
                        {
                            moduleName: 'RichSelectModule',
                            name: 'Rich Select Editor',
                            isEnterprise: true,
                        },
                        {
                            moduleName: 'NumberEditorModule',
                            name: 'Number Editor',
                        },
                        {
                            moduleName: 'DateEditorModule',
                            name: 'Date Editor',
                        },
                        {
                            moduleName: 'CheckboxEditorModule',
                            name: 'Checkbox Editor',
                        },
                    ],
                },
                {
                    moduleName: 'CustomEditorModule',
                    name: 'Custom Cell Editor Components',
                },
                {
                    moduleName: 'UndoRedoEditModule',
                    name: 'Undo / Redo Edits',
                },
            ],
        },
        {
            name: 'Interactivity',
            children: [
                {
                    moduleName: 'LocaleModule',
                    name: 'Localisation',
                },
            ],
        },
        {
            name: 'Row Grouping ',
            children: [
                {
                    moduleName: 'RowGroupingModule',
                    name: 'Row Grouping',
                    isEnterprise: true,
                },
                {
                    moduleName: 'RowGroupingPanelModule',
                    name: 'Row Grouping Panel',
                    isEnterprise: true,
                },
                {
                    moduleName: 'GroupFilterModule',
                    name: 'Group Filter',
                    isEnterprise: true,
                },
            ],
        },
        {
            moduleName: 'PivotModule',
            name: 'Pivoting',
            isEnterprise: true,
        },
        {
            moduleName: 'TreeDataModule',
            name: 'Tree Data',
            isEnterprise: true,
        },
        {
            moduleName: 'MasterDetailModule',
            name: 'Master Detail',
            isEnterprise: true,
        },
        {
            name: 'Accessories',
            children: [
                {
                    name: 'Tool Panels',
                    isEnterprise: true,
                    children: [
                        {
                            moduleName: 'SideBarModule',
                            name: 'Side Bar',
                            isEnterprise: true,
                        },
                        {
                            moduleName: 'ColumnsToolPanelModule',
                            name: 'Columns Tool Panel',
                            isEnterprise: true,
                        },
                        {
                            moduleName: 'FiltersToolPanelModule',
                            name: 'Filters Tool Panel',
                            isEnterprise: true,
                        },
                    ],
                },
                {
                    moduleName: 'ColumnMenuModule',
                    name: 'Column Menu',
                    isEnterprise: true,
                },
                {
                    moduleName: 'ContextMenuModule',
                    name: 'Context Menu',
                    isEnterprise: true,
                },
                {
                    moduleName: 'StatusBarModule',
                    name: 'Status Bar',
                    isEnterprise: true,
                },
            ],
        },
        {
            name: 'Import & Export',
            children: [
                {
                    moduleName: 'CsvExportModule',
                    name: 'CSV Export',
                },

                {
                    moduleName: 'ExcelExportModule',
                    name: 'Excel Export',
                    isEnterprise: true,
                },
                {
                    moduleName: 'ClipboardModule',
                    name: 'Clipboard',
                    isEnterprise: true,
                },
                {
                    moduleName: 'DragAndDropModule',
                    name: 'Drag & Drop',
                },
            ],
        },
        {
            name: 'Performance',
            children: [
                {
                    moduleName: 'ValueCacheModule',
                    name: 'Value Cache',
                },
            ],
        },
        {
            name: 'Other',
            children: [
                {
                    moduleName: 'AlignedGridsModule',
                    name: 'Aligned Grids',
                },
            ],
        },
        {
            name: 'API',
            children: [
                {
                    moduleName: 'GridStateModule',
                    name: 'Grid State',
                },
                {
                    moduleName: 'ColumnApiModule',
                    name: 'Column API',
                },
                {
                    moduleName: 'RowApiModule',
                    name: 'Row API',
                },
                {
                    moduleName: 'CellApiModule',
                    name: 'Cell API',
                },
                {
                    moduleName: 'ScrollApiModule',
                    name: 'Scrolling API',
                },
                {
                    moduleName: 'RenderApiModule',
                    name: 'Rendering API',
                },
                {
                    moduleName: 'EventApiModule',
                    name: 'Event API',
                },
                {
                    moduleName: 'ClientSideRowModelApiModule',
                    name: 'Client-Side Row Model API',
                },
                {
                    moduleName: 'ServerSideRowModelApiModule',
                    name: 'Server-Side Row Model API',
                    isEnterprise: true,
                },
            ],
        },
    ],
};
