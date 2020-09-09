import {
    Component,
    IComponentBindings,
    ComponentOptions,
    FacetSlider,
    QueryEvents,
    AnalyticsEvents,
    IPreprocessResultsEventArgs,
    INewQueryEventArgs,
    IChangeAnalyticsCustomDataEventArgs,
    $$
} from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';

export interface IFacetSliderDynamicRangeOptions {
    field: string;
    title?: string;
    id?: string;
    rangeSlider?: boolean;
}

@lazyComponent
export class FacetSliderDynamicRange extends Component {
    static ID = 'FacetSliderDynamicRange';

    public FacetSliderDynamicRange: FacetSlider;
    private cleanedField: string;
    public isActive: boolean;

    static options: IFacetSliderDynamicRangeOptions = {
        field: ComponentOptions.buildStringOption(),
        title: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        id: ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        rangeSlider: ComponentOptions.buildBooleanOption({ defaultValue: true }),
    };

    constructor(public element: HTMLElement, public options: IFacetSliderDynamicRangeOptions, public bindings: IComponentBindings) {
        super(element, FacetSliderDynamicRange.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, FacetSliderDynamicRange, options);
        this.cleanedField = this.options.field.replace('@', '');

        this.bind.onRootElement(QueryEvents.preprocessResults, (args: IPreprocessResultsEventArgs) => this.handlePreprocessResults(args));
        this.bind.onRootElement(QueryEvents.newQuery, (args: INewQueryEventArgs) => this.handleNewQuery(args));
        this.bind.onRootElement(AnalyticsEvents.changeAnalyticsCustomData, (args: IChangeAnalyticsCustomDataEventArgs) => this.handleChangeAnalyticsCustomData(args));
        this.isActive = false;
        this.build()
    }

    private build() {

        this.FacetSliderDynamicRange = new FacetSlider($$('div').el, this.options, this.bindings);
        this.element.append(this.FacetSliderDynamicRange.element);
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
                        // Disabling the Facet
                        facet.disable();
                        // Removing the Facet element
                        this.element.removeChild(child);
                    }
                }
            }
        }
    }

    private handleNewQuery(args: INewQueryEventArgs) {
        if (!this.isActive) {
            this.clearGeneratedFacet();
        }
    }

    private handleChangeAnalyticsCustomData(args: IChangeAnalyticsCustomDataEventArgs) {

        if (args.actionCause == "facetRangeSlider" && args.metaObject['facetId'] == this.options.id) {
            this.isActive = true;
            const facet = Coveo.get(<HTMLElement>this.element.firstChild, 'FacetSlider') as FacetSlider;
            if (facet.initialStartOfSlider.toString() == args.metaObject.facetRangeStart && facet.initialEndOfSlider.toString() == args.metaObject.facetRangeEnd) {
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

    private handlePreprocessResults(args: IPreprocessResultsEventArgs) {

        let currentMin = _.min(args.results.results, (item) => { return item.raw[this.cleanedField]; }).raw[this.cleanedField];
        let currentMax = _.max(args.results.results, (item) => { return item.raw[this.cleanedField]; }).raw[this.cleanedField];

        if (!this.isActive && !(currentMax == currentMin)) {
            const elem = $$('div');
            let options = {
                id: this.options.id,
                title: this.options.title,
                field: this.options.field,
                rangeSlider: true,
                start: currentMin,
                end: currentMax
            }
            this.FacetSliderDynamicRange = new FacetSlider(elem.el, options, this.bindings);
            this.element.append(this.FacetSliderDynamicRange.element);
            setTimeout(() => {
                const facet = Coveo.get(<HTMLElement>this.element.firstChild, 'FacetSlider') as FacetSlider;
                facet.enable();
                facet.element.classList.remove('coveo-disabled-empty');
                facet.element.classList.remove('coveo-disabled');
            }, 200);
        }
    }
}
