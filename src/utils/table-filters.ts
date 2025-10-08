export interface TableFilters {
    filters: {[key: string]: TableFilter};
}

export interface TableFilter {
    min?: number;
    max?: number;
}