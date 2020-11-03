import * as React from 'react';
import * as FilterHelper from '../../components/FilterList/FilterHelper';
import { RenderContent } from '../../components/Nav/Page';
import * as AppListFilters from './FiltersAndSorts';
import DefaultSecondaryMasthead from '../../components/DefaultSecondaryMasthead/DefaultSecondaryMasthead';
import * as FilterComponent from '../../components/FilterList/FilterComponent';
import { AppListItem } from '../../types/AppList';
import { DurationInSeconds } from '../../types/Common';
import Namespace from '../../types/Namespace';
import { PromisesRegistry } from '../../utils/CancelablePromises';
import { KialiAppState } from '../../store/Store';
import { activeNamespacesSelector, durationSelector } from '../../store/Selectors';
import { connect } from 'react-redux';
import { namespaceEquals } from '../../utils/Common';
import { SortField } from '../../types/SortFilters';
import { ActiveFiltersInfo } from '../../types/Filters';
import { FilterSelected, StatefulFilters } from '../../components/Filters/StatefulFilters';
import * as API from '../../services/Api';
import * as AppListClass from './AppListClass';
import VirtualList from '../../components/VirtualList/VirtualList';
import TimeControlsContainer from '../../components/Time/TimeControls';

type AppListPageState = FilterComponent.State<AppListItem>;

type ReduxProps = {
  duration: DurationInSeconds;
  activeNamespaces: Namespace[];
};

type AppListPageProps = ReduxProps & FilterComponent.Props<AppListItem>;

class AppListPageComponent extends FilterComponent.Component<AppListPageProps, AppListPageState, AppListItem> {
  private promises = new PromisesRegistry();

  constructor(props: AppListPageProps) {
    super(props);
    const prevCurrentSortField = FilterHelper.currentSortField(AppListFilters.sortFields);
    const prevIsSortAscending = FilterHelper.isCurrentSortAscending();
    this.state = {
      listItems: [],
      currentSortField: prevCurrentSortField,
      isSortAscending: prevIsSortAscending
    };
  }

  componentDidMount() {
    this.updateListItems();
  }

  componentDidUpdate(prevProps: AppListPageProps, _prevState: AppListPageState, _snapshot: any) {
    const prevCurrentSortField = FilterHelper.currentSortField(AppListFilters.sortFields);
    const prevIsSortAscending = FilterHelper.isCurrentSortAscending();
    const [paramsSynced] = this.paramsAreSynced(prevProps);
    if (!paramsSynced) {
      this.setState({
        currentSortField: prevCurrentSortField,
        isSortAscending: prevIsSortAscending
      });
      this.updateListItems();
    }
  }

  componentWillUnmount() {
    this.promises.cancelAll();
  }

  paramsAreSynced = (prevProps: AppListPageProps): [boolean, boolean] => {
    const activeNamespacesCompare = namespaceEquals(prevProps.activeNamespaces, this.props.activeNamespaces);
    const paramsSynced = prevProps.duration === this.props.duration && activeNamespacesCompare;
    return [paramsSynced, activeNamespacesCompare];
  };

  sortItemList(items: AppListItem[], sortField: SortField<AppListItem>, isAscending: boolean): Promise<AppListItem[]> {
    // Chain promises, as there may be an ongoing fetch/refresh and sort can be called after UI interaction
    // This ensures that the list will display the new data with the right sorting
    return this.promises.registerChained('sort', items, unsorted =>
      AppListFilters.sortAppsItems(unsorted, sortField, isAscending)
    );
  }

  updateListItems() {
    this.promises.cancelAll();

    const activeFilters: ActiveFiltersInfo = FilterSelected.getSelected();
    const namespacesSelected = this.props.activeNamespaces.map(item => item.name);

    if (namespacesSelected.length === 0) {
      this.promises
        .register('namespaces', API.getNamespaces())
        .then(namespacesResponse => {
          const namespaces: Namespace[] = namespacesResponse.data;
          this.fetchApps(
            namespaces.map(namespace => namespace.name),
            activeFilters,
            this.props.duration
          );
        })
        .catch(namespacesError => {
          if (!namespacesError.isCanceled) {
            this.handleAxiosError('Could not fetch namespace list', namespacesError);
          }
        });
    } else {
      this.fetchApps(namespacesSelected, activeFilters, this.props.duration);
    }
  }

  fetchApps(namespaces: string[], filters: ActiveFiltersInfo, rateInterval: number) {
    const appsPromises = namespaces.map(namespace => API.getApps(namespace));
    this.promises
      .registerAll('apps', appsPromises)
      .then(responses => {
        let appListItems: AppListItem[] = [];
        responses.forEach(response => {
          appListItems = appListItems.concat(AppListClass.getAppItems(response.data, rateInterval));
        });
        return AppListFilters.filterBy(appListItems, filters);
      })
      .then(appListItems => {
        this.promises.cancel('sort');
        this.sortItemList(appListItems, this.state.currentSortField, this.state.isSortAscending)
          .then(sorted => {
            this.setState({
              listItems: sorted
            });
          })
          .catch(err => {
            if (!err.isCanceled) {
              console.debug(err);
            }
          });
      })
      .catch(err => {
        if (!err.isCanceled) {
          this.handleAxiosError('Could not fetch apps list', err);
        }
      });
  }

  render() {
    return (
      <>
        <div style={{ backgroundColor: '#fff' }}>
          <DefaultSecondaryMasthead
            rightToolbar={
              <TimeControlsContainer
                key={'DurationDropdown'}
                id="app-list-duration-dropdown"
                handleRefresh={this.updateListItems}
                disabled={false}
              />
            }
          />
        </div>
        <RenderContent>
          <VirtualList rows={this.state.listItems}>
            <StatefulFilters initialFilters={AppListFilters.availableFilters} onFilterChange={this.onFilterChange} />
          </VirtualList>
        </RenderContent>
      </>
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  activeNamespaces: activeNamespacesSelector(state),
  duration: durationSelector(state)
});

const AppListPage = connect(mapStateToProps)(AppListPageComponent);

export default AppListPage;
