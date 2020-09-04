import { Component, IComponentBindings, ComponentOptions, AnyKeywordsInput } from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';
import $$ = Coveo.$$;

export interface IFacetSliderDynamicRangeOptions {
    field: string;
    title?: string;
    id?: string;
    rangeSlider?: boolean;
}

@lazyComponent
export class FacetSliderDynamicRange extends Component {
    static ID = 'FacetSliderDynamicRange';

    public FacetSliderDynamicRange: Coveo.FacetSlider;
    private cleanedField: string;
    public isActive: boolean;

    static options: IFacetSliderDynamicRangeOptions = {
        field: Coveo.ComponentOptions.buildStringOption(),
        title: Coveo.ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        id: Coveo.ComponentOptions.buildStringOption({ defaultValue: "FacetSliderDynamicRange" }),
        rangeSlider: Coveo.ComponentOptions.buildBooleanOption({ defaultValue: true }),
    };

    constructor(public element: HTMLElement, public options: IFacetSliderDynamicRangeOptions, public bindings: IComponentBindings) {
        super(element, FacetSliderDynamicRange.ID, bindings);
        this.options = ComponentOptions.initComponentOptions(element, FacetSliderDynamicRange, options);
        this.cleanedField = this.options.field.replace('@', '');

        this.bind.onRootElement(Coveo.QueryEvents.preprocessResults, (args: Coveo.IPreprocessResultsEventArgs) => this.handlePreprocessResults(args));
        this.bind.onRootElement(Coveo.QueryEvents.newQuery, (args: Coveo.INewQueryEventArgs) => this.handleNewQuery(args));
        this.bind.onRootElement(Coveo.AnalyticsEvents.changeAnalyticsCustomData, (args: Coveo.IChangeAnalyticsCustomDataEventArgs) => this.handleChangeAnalyticsCustomData(args));
        this.isActive = false;
        this.build()
    }

    private build() {

        this.FacetSliderDynamicRange = new Coveo.FacetSlider($$('div').el, this.options, this.bindings);
        this.element.append(this.FacetSliderDynamicRange.element);
    }

    private clearGeneratedFacet() {
        if (this.element.children) {
            let rescueCounter = 10; // In case it goes into an infinite loop. It is unlikely, but just in case...
            while (this.element.firstChild && rescueCounter > 0) {
                rescueCounter--;
                const child = this.element.firstChild as HTMLElement;
                if (child) {
                    const facet = Coveo.get(child, 'FacetSlider') as Coveo.FacetSlider;
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

    private handleNewQuery(args: Coveo.INewQueryEventArgs) {
        if (!this.isActive) {
            this.clearGeneratedFacet();
        }
    }

    private handleChangeAnalyticsCustomData(args: Coveo.IChangeAnalyticsCustomDataEventArgs) {

        if (args.actionCause == "facetRangeSlider" && args.metaObject['facetId'] == this.options.id) {
            this.isActive = true;
            const facet = Coveo.get(<HTMLElement>this.element.firstChild, 'FacetSlider') as Coveo.FacetSlider;
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

    private handlePreprocessResults(args: Coveo.IPreprocessResultsEventArgs) {

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
            this.FacetSliderDynamicRange = new Coveo.FacetSlider(elem.el, options, this.bindings);
            this.element.append(this.FacetSliderDynamicRange.element);
            setTimeout(() => {
                const facet = Coveo.get(<HTMLElement>this.element.firstChild, 'FacetSlider') as Coveo.FacetSlider;
                facet.enable();
                facet.element.classList.remove('coveo-disabled-empty');
                facet.element.classList.remove('coveo-disabled');
            }, 200);
        }
    }
}
