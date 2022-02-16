import {
    Component,
    IComponentBindings,
    Initialization,
    ComponentOptions,
    FacetSlider,
    QueryEvents,
    AnalyticsEvents,
    IPreprocessResultsEventArgs,
    INewQueryEventArgs,
    IChangeAnalyticsCustomDataEventArgs,
    IDuringQueryEventArgs,
    IGroupByRequest,
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
    valueCaption?: any;
    rounded?: number;
}

export class FacetSliderDynamicRange extends Component {
    static ID = 'FacetSliderDynamicRange';

    public FacetSliderDynamicRange: FacetSlider;
    private cleanedField: string;
    public isActive: boolean;
    public isFetchingMore: boolean;
    public isInit: boolean;
    private initialValues: [number, number];

    static options: IFacetSliderDynamicRangeOptions = {
        field: ComponentOptions.buildStringOption(),
        title: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        id: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        rangeSlider: ComponentOptions.buildBooleanOption({ defaultValue: true }),
        delay: ComponentOptions.buildNumberOption({ defaultValue: 200 }),
        rounded: ComponentOptions.buildNumberOption({ defaultValue: 0 }),
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

        this.initialValues = Coveo.HashUtils.getValue('f:' + this.options.id + ':range', window.location.hash);

        Coveo.load('FacetSlider').then(
            (arg) => {
                Coveo.FacetSlider = arg as any;
                if (this.initialValues) {
                    this.isActive = true;
                    this.generateFacetDom(this.initialValues[0] - 1, this.initialValues[1]);

                } else {
                    this.generateFacetDomWithoutMinMax();
                }
            }
        )
    }

    public reset() {
        const facet = Coveo.get(<HTMLElement>this.element.firstChild, 'FacetSlider') as FacetSlider;
        facet.reset();
        this.isActive = false;
    }

    private clearGeneratedFacet() {
        if (this.element.children) {
            let rescueCounter = 10; // In case it goes into an infinite loop. It is unlikely, but just in case...
            while (this.element.firstChild && rescueCounter > 0) {
                rescueCounter--;
                const child = this.element.firstChild as HTMLElement;
                if (child) {
                    const facet = Coveo.get(child, 'FacetSlider') as FacetSlider;
                    if (facet) {
                        facet.disable();
                        this.element.removeChild(child);
                    }
                }
            }
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
            return gbResult?.globalComputedFieldResults.length;
        });
        return computedGroupBy?.globalComputedFieldResults || [];
    }

    private handleStateChangeQ() {
        this.isActive = false;
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
            if (!this.isActive) {
                this.clearGeneratedFacet();
            }
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
        const elem = $$('div');
        let options = {
            id: this.options.id,
            title: this.options.title,
            field: this.options.field,
            rangeSlider: true,
            rounded: this.options.rounded,
            valueCaption: this.options.valueCaption
        }
        this.FacetSliderDynamicRange = new Coveo.FacetSlider(elem.el, options, this.bindings);
        this.element.append(this.FacetSliderDynamicRange.element);
        setTimeout(() => {
            this.FacetSliderDynamicRange.enable()
            this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled-empty');
            this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled');
        }, this.options.delay);
    }

    protected generateFacetDom(min: number, max: number) {
        const elem = $$('div');
        let options = {
            id: this.options.id,
            title: this.options.title,
            field: this.options.field,
            rangeSlider: true,
            start: min,
            end: max,
            rounded: this.options.rounded,
            valueCaption: this.options.valueCaption
        }
        this.FacetSliderDynamicRange = new Coveo.FacetSlider(elem.el, options, this.bindings);
        this.element.append(this.FacetSliderDynamicRange.element);
        setTimeout(() => {
            this.FacetSliderDynamicRange.enable()
            this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled-empty');
            this.FacetSliderDynamicRange.element.classList.remove('coveo-disabled');
        }, this.options.delay);
    }

    private handlePreprocessResults(args: IPreprocessResultsEventArgs) {
        
        const minMaxValues = this.getComputedValues(args.results);
        const itemMin = _.min(args.results.results, (item) => { return item.raw[this.cleanedField]; });
        const itemMax = _.max(args.results.results, (item) => { return item.raw[this.cleanedField]; });

        const currentMin = minMaxValues[0] || itemMin.raw[this.cleanedField];
        const currentMax = minMaxValues[1] || itemMax.raw[this.cleanedField];

        if (!this.isActive && !(currentMax == currentMin) && !this.isFetchingMore) {
            this.clearGeneratedFacet();
            this.generateFacetDom(currentMin, currentMax);
        }
        this.isFetchingMore = false;
    }
}
Initialization.registerAutoCreateComponent(FacetSliderDynamicRange);
