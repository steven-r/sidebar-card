import { SIDEBAR_CARD_TITLE } from "./config";

// Returns the root element
export function getRoot() {
    let root: Element | ShadowRoot | null = document.querySelector('home-assistant');
    root = root && root.shadowRoot;
    root = root && root.querySelector('home-assistant-main');
    root = root && root.shadowRoot;
    root = root && root.querySelector('ha-drawer partial-panel-resolver');
    root = (root && root.shadowRoot) || root;
    root = root && root.querySelector('ha-panel-lovelace');
    root = root && root.shadowRoot;
    root = root && root.querySelector('hui-root');

    return root as Element;
}

export function get_lovelace() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let root: any = document.querySelector("hc-main");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ll: any;
    if (root) {
        ll = root._lovelaceConfig;
        ll.current_view = root._lovelacePath;
        return ll as HTMLElement;
    }

    root = document.querySelector("home-assistant");
    root = root && root.shadowRoot;
    root = root && root.querySelector("home-assistant-main");
    root = root && root.shadowRoot;
    root = root && root.querySelector("ha-drawer");
    root = root && root.querySelector("partial-panel-resolver");
    root = root && root.shadowRoot || root;
    root = root && root.querySelector("ha-panel-lovelace")
    root = root && root.shadowRoot;
    root = root && root.querySelector("hui-root")
    if (root) {
        ll = root.lovelace
        ll.current_view = root.___curView;
        return ll as HTMLElement;
    }

    return null;
}


// return var(--header-height) from #view element
// We need to take from the div#view element in case of "kiosk-mode" module installation that defined new CSS var(--header-height) as local new variable, not available in div#customSidebar
export function getHeaderHeightPx() {
    let headerHeightPx = '0px';
    const root = getRoot();
    const view = root.shadowRoot!.getElementById('view');
    //debugger;
    if (view && window.getComputedStyle(view) !== undefined) {
        headerHeightPx = window.getComputedStyle(view).paddingTop;
    }
    return headerHeightPx;
}

// Returns the Home Assistant Sidebar element
export function getSidebar() {
    let sidebar: HTMLElement | ShadowRoot | null = document.querySelector<HTMLElement>('home-assistant');
    sidebar = sidebar && sidebar.shadowRoot;
    sidebar = sidebar && sidebar.querySelector<HTMLElement>('home-assistant-main');
    sidebar = sidebar && sidebar.shadowRoot;
    sidebar = sidebar && sidebar.querySelector<HTMLElement>('ha-drawer ha-sidebar');

    return sidebar;
}

// Returns the Home Assistant app-drawer layout element
export function getAppDrawerLayout() {
    let appDrawerLayout: HTMLElement | ShadowRoot | null = document.querySelector<HTMLElement>('home-assistant');
    appDrawerLayout = appDrawerLayout && appDrawerLayout.shadowRoot;
    appDrawerLayout = appDrawerLayout && appDrawerLayout.querySelector<HTMLElement>('home-assistant-main');
    appDrawerLayout = appDrawerLayout && appDrawerLayout.shadowRoot;
    appDrawerLayout = appDrawerLayout && appDrawerLayout.querySelector<HTMLElement>('ha-drawer'); // ha-drawer
    appDrawerLayout = appDrawerLayout && appDrawerLayout.shadowRoot;
    appDrawerLayout = appDrawerLayout && appDrawerLayout.querySelector<HTMLElement>('.mdc-drawer-app-content');

    return appDrawerLayout;
}

// Returns the Home Assistant app-drawer element
export function getAppDrawer() {
    let appDrawer: HTMLElement | ShadowRoot | null = document.querySelector<HTMLElement>('home-assistant');
    appDrawer = appDrawer && appDrawer.shadowRoot;
    appDrawer = appDrawer && appDrawer.querySelector<HTMLElement>('home-assistant-main');
    appDrawer = appDrawer && appDrawer.shadowRoot;
    appDrawer = appDrawer && appDrawer.querySelector<HTMLElement>('ha-drawer'); // ha-drawer
    appDrawer = appDrawer && appDrawer.shadowRoot;
    appDrawer = appDrawer && appDrawer.querySelector<HTMLElement>('.mdc-drawer');

    return appDrawer;
}// ##########################################################################################
// ###   Helper methods
// ##########################################################################################
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function log2console(method: string, message: string, object?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lovelace: any = await getConfig();
  if (lovelace.config.sidebar) {
    const sidebarConfig = Object.assign({}, lovelace.config.sidebar);
    if (sidebarConfig.debug === true) {
      console.info(`%c${SIDEBAR_CARD_TITLE}: %c ${method.padEnd(24)} -> %c ${message}`, 'color: chartreuse; background: black; font-weight: 700;', 'color: yellow; background: black; font-weight: 700;', '', object);
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
async function error2console(method: string, message: string, object?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lovelace: any = await getConfig();
  if (lovelace.config.sidebar) {
    const sidebarConfig = Object.assign({}, lovelace.config.sidebar);
    if (sidebarConfig.debug === true) {
      console.error(`%c${SIDEBAR_CARD_TITLE}: %c ${method.padEnd(24)} -> %c ${message}`, 'color: red; background: black; font-weight: 700;', 'color: white; background: black; font-weight: 700;', 'color:red', object);
    }
  }
}
// Returns a query parameter by its name
export function getParameterByName(name: string, url = window.location.href) {
  const parameterName = name.replace(/[[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + parameterName + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);

  if (!results) return null;
  if (!results[2]) return '';

  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
// gets the lovelace config
export async function getConfig() {
  let ll: HTMLElement | null = null;
  while (!ll) {
    ll = get_lovelace();
    if (!ll) {
      await sleep(500);
    }
  }

  return ll;
}
// non-blocking sleep function

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

