import {
  definePlugin,
  ServerAPI,
  quickAccessMenuClasses,
  afterPatch,
  fakeRenderComponent,
  findInReactTree,
  findInTree,
  MenuItem,
  Router,
} from 'decky-frontend-lib';

import QuickAccessSettings from './QuickAccessSettings';
import MenuIcon from './components/Icons/MenuIcon';
import { SGDBProvider } from './hooks/useSGDB';
import { SettingsProvider } from './hooks/useSettings';
import SGDBPage from './SGDBPage';
import t from './utils/i18n';
import log from './utils/log';

// Add button second to last
const spliceArtworkItem = (children: any[], appid: number) => {
  children.splice(-1, 0, (
    <MenuItem
      key="sgdb-change-artwork"
      onSelected={() => {
        Router.Navigate(`/steamgriddb/${appid}`);
      }}
    >
      {t('ACTION_CHANGE_ARTWORK', 'Change artwork...')}
    </MenuItem>
  ));
};

export default definePlugin((serverApi: ServerAPI) => {
  serverApi.routerHook.addRoute('/steamgriddb/:appid/:assetType?', () => (
    <SettingsProvider serverApi={serverApi}>
      <SGDBProvider serverApi={serverApi}>
        <SGDBPage />
      </SGDBProvider>
    </SettingsProvider>
  ), {
    exact: true,
  });

  const LibraryContextMenu = fakeRenderComponent(
    findInReactTree(
      fakeRenderComponent(
        findInTree(
          fakeRenderComponent(
            // @ts-ignore: DFL global is not typed
            window.DeckyPluginLoader.routerHook.routes.find((x) => x?.props?.path == '/zoo').props.children.type
          ), (x) => x?.route === '/zoo/modals',
          {
            walkable: ['props', 'children', 'child', 'pages'],
          }
        ).content.type
      ),
      (x) => x?.title?.includes('AppActionsMenu')
    ).children.type
  ).type;

  const patchedMenu = afterPatch(LibraryContextMenu.prototype, 'render', (_: Record<string, unknown>[], component: any) => {
    log(component);
    const appid = component._owner.pendingProps.overview.appid;
    afterPatch(component.type.prototype, 'shouldComponentUpdate', ([nextProps]: any, shouldUpdate: any) => {
      if (shouldUpdate === true && !nextProps.children.find((x: any) => x?.key === 'sgdb-change-artwork')) {
        spliceArtworkItem(nextProps.children, appid);
      }
      return shouldUpdate;
    }, { singleShot: true });

    spliceArtworkItem(component.props.children, appid);
    return component;
  });

  return {
    title: <div className={quickAccessMenuClasses.Title}>SteamGridDB</div>,
    content: <QuickAccessSettings serverAPI={serverApi} />,
    icon: <MenuIcon />,
    onDismount() {
      serverApi.routerHook.removeRoute('/steamgriddb/:appid/:assetType?');
      patchedMenu?.unpatch();
    },
  };
});
