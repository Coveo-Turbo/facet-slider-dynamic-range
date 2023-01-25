import {
    Component,
    IComponentBindings,
    Initialization,
    LazyInitialization,
    ComponentOptions,
    FacetSlider,
    QueryEvents,
    AnalyticsEvents,
    IPreprocessResultsEventArgs,
    INewQueryEventArgs,
    IChangeAnalyticsCustomDataEventArgs,
    IDuringQueryEventArgs,
    IGroupByRequest,
    IComponentOptionsObjectOptionArgs,
    $$,
    IDoneBuildingQueryEventArgs,
    IQueryResults,
    IGroupByResult,
} from 'coveo-search-ui';

export interface IFacetSliderDynamicRangeOptions {
    field: string;
    title?: string;
    id?: string;
    rangeSlider?: boolean;
    delay?: number;
    rounded?: number;
    steps?: number;
    displayAsValue?: {
      enable?: boolean;
      unitSign?: string;
      separator?: string;
    };
    displayAsPercent?: {
      enable?: boolean;
      separator?: string;
    };
    valueCaption?: (values: number[]) => string;
}

export function lazyFacetSliderDynamicRange(): any {
    return Coveo.load('FacetSlider').then((arg) => {
        Coveo.FacetSlider = arg as any;

        class FacetSliderDynamicRange extends Component {
            static ID = 'FacetSliderDynamicRange';

            public FacetSliderDynamicRange: FacetSlider;
            private cleanedField: string;
            public isActive: boolean;
            public isFetchingMore: boolean;
            public isInitialQuery: boolean;
            public isInit: boolean;
            private initialValues: [number, number];

            static options: IFacetSliderDynamicRangeOptions = {
                field: ComponentOptions.buildStringOption(),
                title: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
                id: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
                rangeSlider: ComponentOptions.buildBooleanOption({ defaultValue: true }),
                delay: ComponentOptions.buildNumberOption({ defaultValue: 200 }),
                rounded: ComponentOptions.buildNumberOption({ defaultValue: 0 }),
                steps: ComponentOptions.buildNumberOption({ defaultValue: 2 }),
                displayAsValue: ComponentOptions.buildObjectOption(<IComponentOptionsObjectOptionArgs>{
                subOptions: {
                    enable: ComponentOptions.buildBooleanOption({ defaultValue: true }),
                    unitSign: ComponentOptions.buildStringOption(),
                    separator: ComponentOptions.buildStringOption({ defaultValue: '-' })
                },
                section: 'Display'
                }),
                displayAsPercent: ComponentOptions.buildObjectOption(<IComponentOptionsObjectOptionArgs>{
                subOptions: {
                    enable: ComponentOptions.buildBooleanOption({ defaultValue: false }),
                    separator: ComponentOptions.buildStringOption({ defaultValue: '-' })
                },
                section: 'Display'
                }),
            
                valueCaption: ComponentOptions.buildCustomOption<(values: number[]) => string>(() => {
                    return null;
                })
            };

            constructor(public element: HTMLElement, public options: IFacetSliderDynamicRangeOptions, public bindings: IComponentBindings) {
                super(element, FacetSliderDynamicRange.ID, bindings);
                this.options = ComponentOptions.initComponentOptions(element, FacetSliderDynamicRange, options);
                this.cleanedField = this.options.field.replace('@', '');

                this.bind.onRootElement('state:change:q', () => this.handleStateChangeQ());
                this.bind.onRootElement(QueryEvents.duringFetchMoreQuery, (args: IDuringQueryEventArgs) => this.handleDuringFetchMoreQuery(args));
                this.bind.onRootElement(QueryEvents.doneBuildingQuery, (args: IDoneBuildingQueryEventArgs) => this.handleDoneBuildingQuery(args));
                this.bind.onRootElement(QueryEvents.preprocessResults, (args: IPreprocessResultsEventArgs) => this.handlePreprocessResults(args));
                this.bind.onRootElement(QueryEvents.newQuery, (args: INewQueryEventArgs) => this.handleNewQuery(args));
                this.bind.onRootElement(AnalyticsEvents.changeAnalyticsCustomData, (args: IChangeAnalyticsCustomDataEventArgs) => this.handleChangeAnalyticsCustomData(args));
                this.isActive = false;
                this.isFetchingMore = false;
                this.isInitialQuery = true;

                this.initialValues = Coveo.HashUtils.getValue('f:' + this.options.id + ':range', window.location.hash);

                if (this.initialValues) {
                    this.isActive = true;
                    this.generateFacetDom(+(this.initialValues[0]-1), +this.initialValues[1]);
                } else {
                    this.generateFacetDomWithoutMinMax();
                }
            }

            public reset() {
                this.FacetSliderDynamicRange.reset();
                this.isActive = false;
            }

            private clearGeneratedFacet() {
                if(this.FacetSliderDynamicRange){
                    this.FacetSliderDynamicRange.disable();
                    this.element.removeChild(this.FacetSliderDynamicRange.element);
                    const existingFacet = this.componentStateModel.attributes[Coveo.QueryStateModel.getFacetId(this.FacetSliderDynamicRange.options.id)];
                    if (existingFacet && existingFacet.length) {
                    // Even if we disable the Facet component and remove the HTML element form the DOM, it will continue to exist in the componentStateModel. So we need to manually remove it from the state.
                    this.componentStateModel.attributes[Coveo.QueryStateModel.getFacetId(this.FacetSliderDynamicRange.options.id)] = [];
                    }
                    this.FacetSliderDynamicRange = null;
                }
            }

            private buildComputedGroupByRequest(): IGroupByRequest {
                return {
                    field: this.options.field,
                    injectionDepth: 10000,
                    computedFields: [
                        {
                            field: this.options.field,
                            operation: 'minimum'
                        },
                        {
                            field: this.options.field,
                            operation: 'maximum'
                        }
                    ],
                    maximumNumberOfValues: 1
                };
            }

            private getComputedValues(results: IQueryResults){
                const computedGroupBy: IGroupByResult = _.find(results.groupByResults, (gbResult) => {
                    return gbResult?.globalComputedFieldResults.length && gbResult.field === this.cleanedField;
                });
                return computedGroupBy?.globalComputedFieldResults || [];
            }

            private handleStateChangeQ() {
                if (!this.isInitialQuery) {
                    this.isActive = false;
                }
            }

            private handleDuringFetchMoreQuery(args: IDuringQueryEventArgs) {
                this.isFetchingMore = true;
            }

            private handleDoneBuildingQuery(args: IDoneBuildingQueryEventArgs) {
                const minMaxGroupBy = this.buildComputedGroupByRequest();
                args.queryBuilder.groupByRequests.push(minMaxGroupBy);
            }
        
            private handleNewQuery(args: INewQueryEventArgs) {
                if (!this.isInit) {
                    if (!this.isActive && !args.cancel) {
                        this.clearGeneratedFacet();
                    }
                }
                if (this.isInitialQuery) {
                    this.isInitialQuery = false;
                }
            }

            private handleChangeAnalyticsCustomData(args: IChangeAnalyticsCustomDataEventArgs) {

                if (args.actionCause == "facetRangeSlider" && args.metaObject['facetId'] == this.options.id) {
                    this.isActive = true;
                    if (this.FacetSliderDynamicRange.initialStartOfSlider.toString() == args.metaObject.facetRangeStart && this.FacetSliderDynamicRange.initialEndOfSlider.toString() == args.metaObject.facetRangeEnd) {
                        this.isActive = false;
                    }
                }

                if (args.actionCause == "facetClearAll" && args.metaObject['facetId'] == this.options.id) {
                    this.isActive = false;
                }

                if (args.actionCause == "breadcrumbResetAll") {
                    this.isActive = false;
                }

            }

            protected generateFacetDomWithoutMinMax() {
                const {delay, ...options} = this.options;
                this.buildFacetSlider(options);
            }

            protected generateFacetDom(min: number, max: number) {
                const {delay, ...defaultOptions} = this.options;
                min = +min.toFixed(defaultOptions.rounded);
                max = +max.toFixed(defaultOptions.rounded);
                const options = {
                    ...defaultOptions,
                    start: min,
                    end: max
                }
                this.buildFacetSlider(options);
            }

            protected buildFacetSlider(options: Coveo.IFacetSliderOptions) {
                const elem = $$('div');
                this.FacetSliderDynamicRange = new Coveo.FacetSlider(elem.el, options, this.bindings);
                
                this.element.append(this.FacetSliderDynamicRange.element);
                setTimeout(() => {
                    if(this.FacetSliderDynamicRange && this.FacetSliderDynamicRange['slider']){
                        const defautGetValues = this.FacetSliderDynamicRange['slider'].getValues;
                        this.FacetSliderDynamicRange['slider'].getValues = function () {
                            const values = defautGetValues.call(this);
                            return [+values[0].toFixed(options.rounded), +values[1].toFixed(options.rounded)];
                        }
                        this.FacetSliderDynamicRange.enable();
                        this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled-empty');
                        this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled');
                    }
                }, this.options.delay);
            }

            private handlePreprocessResults(args: IPreprocessResultsEventArgs) {
                
                if(args.results?.results.length){
                    const minMaxValues = this.getComputedValues(args.results);
                    const itemMin = _.min(args.results.results, (item) => { return item.raw[this.cleanedField]; });
                    const itemMax = _.max(args.results.results, (item) => { return item.raw[this.cleanedField]; });

                    const currentMin = _.isFinite(minMaxValues[0]) ? minMaxValues[0] : (typeof itemMin === 'object' ? itemMin?.raw[this.cleanedField] : 0) || 0;
                    const currentMax = _.isFinite(minMaxValues[1]) ? minMaxValues[1] : (typeof itemMax === 'object' ? itemMax?.raw[this.cleanedField] : 0) || 0;

                    if (!this.isActive && !(currentMax == currentMin) && !this.isFetchingMore) {
                        this.clearGeneratedFacet();
                        this.generateFacetDom(currentMin, currentMax);
                    }
                    this.isFetchingMore = false;
                }
            }
        }
        Initialization.registerAutoCreateComponent(FacetSliderDynamicRange);
        return FacetSliderDynamicRange;
    });
};

LazyInitialization.registerLazyComponent('FacetSliderDynamicRange', lazyFacetSliderDynamicRange);