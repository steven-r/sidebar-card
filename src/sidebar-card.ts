// ##########################################################################################
// ###   Import dependencies
// ##########################################################################################

import { css, html, LitElement } from 'lit';
import { state, property } from 'lit/decorators.js';

import { hass, provideHass } from 'card-tools/src/hass';
import { subscribeRenderTemplate } from 'card-tools/src/templates';
import { DateTime } from 'luxon';
import { HomeAssistant } from 'custom-card-helpers';
import { getAppDrawer, getAppDrawerLayout, getHeaderHeightPx, getRoot, getSidebar } from './helpers';
import { log2console } from './helpers';
import { getParameterByName } from './helpers';
import { getConfig } from './helpers';
import { SIDEBAR_CARD_TITLE } from './config';
import { SIDEBAR_CARD_VERSION } from './config';

// ##########################################################################################
// ###   The actual Sidebar Card element
// ##########################################################################################

const TEMPLATE_LINE_REGEX = /<(?:li|div)(?:\s+(?:class|id)\s*=\s*"([^"]*)")*\s*>([^<]*)<\/(?:li|div)>/g;

interface LovelaceElement extends HTMLElement {
  hass: HomeAssistant;
  setConfig(config: object): void;
}

interface ItemNumberList {
  [key: string]: number;
}

const DEFAULT_CONFIG = {
  width: 25,
  clock: true,
  dateFormat: 'DD',
  digitalClockWithSeconds: false,
  twelveHourVersion: false,
  period: false,
  date: false,
};

interface WidthConfig {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}
interface BreakpointConfig {
  mobile?: number;
  tablet?: number;
}

interface SidebarConfig {
  clock?: "digital" | "analog";
  digitalClockWithSeconds?: boolean;
  period?: boolean;
  date?: boolean;
  dateFormat?: string;
  style: string;
  twelveHourVersion?: boolean;
  showTopMenuOnMobile?: boolean;
  hideTopMenu?: boolean;
  hideHassSidebar?:boolean;
  breakpoints?: BreakpointConfig;
  width?: number | WidthConfig;
  hideOnPath?: string[];
  template?: string;
  title?: string;
  cards?: ItemNumberList[];
  entity_ids?: string[];
  bottom_card?: ItemNumberList;
}

class SidebarCard extends LitElement {
  /* **************************************** *
   *        Element's local properties        *
   * **************************************** */

  @state() config!: SidebarConfig;
  @state() current_date!: string;
  @state() current_time!: string;
  @property() templateLines: string[] = [];
  @property() cards: LovelaceElement[] = [];
  @property() bottomCard?: LovelaceElement = undefined;

  _hass!: HomeAssistant;

  CUSTOM_TYPE_PREFIX = 'custom:';

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.cards?.forEach((e) => {e.hass = hass});
  }

  /**
   * get width based on 'type', applying defaults
   * @param type either `mobile`, 'tablet', or 'desktop`
   * @returns 
   */
  getWidth(type: string): number {
    const w = {
      mobile: this.config.width ?
        typeof (this.config.width) == typeof (Number) ? this.config.width as number : (this.config.width as WidthConfig).mobile ?? 25
        : 25,
      tablet: this.config.width ?
        typeof (this.config.width) == typeof (Number) ? this.config.width as number : (this.config.width as WidthConfig).tablet ?? 25
        : 25,
      desktop: this.config.width ?
        typeof (this.config.width) == typeof (Number) ? this.config.width as number : (this.config.width as WidthConfig).desktop ?? 25
        : 25,
    }
    switch (type) {
      case 'mobile': return w.mobile;
      case 'tablet': return w.tablet;
      case 'desktop': return w.desktop;
      default:
        throw new Error(`Unknown type ${type}`);
    }
  }

  /**
   * get break type
   * @param width - document view width
   * @returns 
   */
  getBreakpoint(width: number): string {
    const mobileBreak = this.config.breakpoints ?
      this.config.breakpoints.mobile ?? 768
      : 768;
    const tabletBreak = this.config.breakpoints ?
      this.config.breakpoints.tablet ?? 1924
      : 1024;
    if (width <= mobileBreak) return "mobile";
    if (width <= tabletBreak) return "tablet";
    return "desktop";
  }

  /* **************************************** *
   *   Element's HTML renderer (lit-element)  *
   * **************************************** */

  render() {
    const title = this.config.title ?? false;
    return html`
      ${this.config.style
        ? html`
            <style>
              ${this.config.style}
            </style>
          `
        : html``}

      <div class="sidebar-inner">
        ${this.config.clock === "digital"
        ? html`
              <h1 class="digitalClock${title ? ' with-title' : ''}${this.config.digitalClockWithSeconds === true ? ' with-seconds' : ''}"></h1>
            `
        : html``}
        ${this.config.clock === "analog"
        ? html`
              <div class="clock">
                <div class="wrap">
                  <span class="hour"></span>
                  <span class="minute"></span>
                  <span class="second"></span>
                  <span class="dot"></span>
                </div>
              </div>
            `
        : html``}
        ${title
        ? html`
              <h1 class="title">${title}</h1>
            `
        : html``}
        ${this.config.date === true
        ? html`
              <h2 class="date">${this.current_date}</h2>
            `
        : html``}
        ${this.config.template
        ? html`
              <ul class="template">
                ${this.templateLines.map((line) => {
                  return html`
                    ${createElementFromHTML(line)}
                  `;
                  })}
              </ul>
            `
        : html``}
        ${this.cards && this.cards.length > 0
        ? html`<div class="sidebarcards">
            ${this.cards.map(c => html`<div>${c}</div>`)}
          </div>`
        : html``}
        ${this.bottomCard
          ? html`
              <div class="bottom">${this.bottomCard}</div>
            `
          : html``}
      </div>
    `;
  }

  async updated(changedProperties) {
    super.updated(changedProperties);
    log2console("updated", "what?", changedProperties);
    if (changedProperties.has("open")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((this as any)._cardMod)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)._cardMod.forEach((cm) => cm.refresh());
    }
    if (this.config.cards && this.cards.length == 0) {
      await this._createCards();
      await this.updateComplete;
      this.requestUpdate();
    }
    if (this.config.bottom_card && this.bottomCard == undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardHelpers = await (window as any).loadCardHelpers();
      this.bottomCard = this._createCard(this.config.bottom_card, cardHelpers);
      await this.updateComplete;
      this.requestUpdate();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _createCard(cardConfig: ItemNumberList, cardHelpers: any): LovelaceElement {
    const el = cardHelpers.createCardElement(cardConfig);
    el.addEventListener("ll-rebuild", (ev: Event) => {
      ev.stopPropagation();
      this._rebuildCard(el, cardConfig);
    });
    el.hass = this._hass;
    el.setConfig?.(cardConfig);
    return el;
  }

  async _createCards() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardHelpers = await (window as any).loadCardHelpers();
    this.cards = this.config.cards!.map((cardConfig) => {
      return this._createCard(cardConfig, cardHelpers);
    });
  }

  async _rebuildCard(el: LovelaceElement, cardConfig: ItemNumberList) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardHelpers = await (window as any).loadCardHelpers();
    const newEl = this._createCard(cardConfig, cardHelpers);
    if (el.parentElement) {
      el.parentElement.replaceChild(newEl, el);
    }
    this.cards = this.cards.map((card) => (card === el ? newEl : card));
  }

  _runClock() {
    let hoursampm: number;
    let digitalTime: string | null;
    const date = new Date();

    let fullHours = date.getHours().toString();
    const realHours = date.getHours();
    const hours = ((realHours + 11) % 12) + 1;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    if (hours == 0 && minutes == 0 && seconds < 2) {
      this._runDate();
    }
    const hour = Math.floor((hours * 60 + minutes) / 2);
    const minute = minutes * 6;
    const second = seconds * 6;

    if (this.config.clock === "analog") {
      this.shadowRoot!.querySelector<HTMLElement>('.hour')!.style.transform = `rotate(${hour}deg)`;
      this.shadowRoot!.querySelector<HTMLElement>('.minute')!.style.transform = `rotate(${minute}deg)`;
      this.shadowRoot!.querySelector<HTMLElement>('.second')!.style.transform = `rotate(${second}deg)`;
    }
    if (this.config.clock == "digital" && this.config.twelveHourVersion !== true) {
      const minutesString = minutes.toString();
      digitalTime = fullHours.length < 2 ? '0' + fullHours + ':' : fullHours + ':';
      if (this.config.digitalClockWithSeconds === true) {
        digitalTime += minutesString.length < 2 ? '0' + minutesString + ':' : minutesString + ':';
        const secondsString = seconds.toString();
        digitalTime += secondsString.length < 2 ? '0' + secondsString : secondsString;
      } else {
        digitalTime += minutesString.length < 2 ? '0' + minutesString : minutesString;
      }
      this.shadowRoot!.querySelector('.digitalClock')!.textContent = digitalTime;
    } else if (this.config.clock == "digital" && this.config.twelveHourVersion === true && !this.config.period === true) {
      hoursampm = date.getHours();
      hoursampm = hoursampm % 12;
      hoursampm = hoursampm ? hoursampm : 12;
      fullHours = hoursampm.toString();
      const minutesString = minutes.toString();
      digitalTime = fullHours.length < 2 ? '0' + fullHours + ':' : fullHours + ':';
      if (this.config.digitalClockWithSeconds === true) {
        digitalTime += minutesString.length < 2 ? '0' + minutesString + ':' : minutesString + ':';
        const secondsString = seconds.toString();
        digitalTime += secondsString.length < 2 ? '0' + secondsString : secondsString;
      } else {
        digitalTime += minutesString.length < 2 ? '0' + minutesString : minutesString;
      }
      //digitalTime;
      this.shadowRoot!.querySelector('.digitalClock')!.textContent = digitalTime;
    }
    else if (this.config.clock == "digital" && this.config.twelveHourVersion === true && this.config.period === true) {
      const ampm = realHours >= 12 ? 'pm' : 'am';
      hoursampm = date.getHours();
      hoursampm = hoursampm % 12;
      hoursampm = hoursampm ? hoursampm : 12;
      fullHours = hoursampm.toString();
      const minutesString = minutes.toString();
      digitalTime = fullHours.length < 2 ? '0' + fullHours + ':' : fullHours + ':';
      if (this.config.digitalClockWithSeconds === true) {
        digitalTime += minutesString.length < 2 ? '0' + minutesString + ':' : minutesString + ':';
        const secondsString = seconds.toString();
        digitalTime += secondsString.length < 2 ? '0' + secondsString : secondsString;
      } else {
        digitalTime += minutesString.length < 2 ? '0' + minutesString : minutesString;
      }
      digitalTime += ' ' + ampm;
      this.shadowRoot!.querySelector('.digitalClock')!.textContent = digitalTime;
    }
  }

  _runDate() {
    const now = DateTime.local();
    now.setLocale(this._hass.language);
    this.current_date = now.toFormat(this.config.dateFormat);
  }

  updateSidebarSize() {
    const sidebarInner = this.shadowRoot?.querySelector<HTMLElement>('.sidebar-inner');
    const headerHeightPx = getHeaderHeightPx();

    if (sidebarInner) {
      sidebarInner.style.width = this.offsetWidth + 'px';
      if (this.config.hideTopMenu) {
        sidebarInner.style.height = `${window.innerHeight}px`;
        sidebarInner.style.top = '0px';
      } else {
        sidebarInner.style.height = `calc(${window.innerHeight}px - ` + headerHeightPx + `)`;
        sidebarInner.style.top = headerHeightPx;
      }
    }
  }

  async _finishSetup() {
    provideHass(this);
    const inc = 1000;
    this._runDate(); // init date
    setInterval(() => {
      this._runClock();
    }, inc);

    setTimeout(() => {
      this.updateSidebarSize();
    }, 1);
    window.addEventListener('resize', () => this.updateSidebarSize(), true);
  }


  setConfig(config: SidebarConfig) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);

    if (this.config.clock) {
      if (!(this.config.clock == "analog" || this.config.clock == "digital")) {
        throw Error(`Unknown clock type ${this.config.clock}`);
      }
    }
    if (this.config.template) {
      subscribeRenderTemplate(
        null,
        (res) => {
          this.templateLines = res.match(TEMPLATE_LINE_REGEX).map( (val) => val);
          this.requestUpdate();
        },
        {
          template: this.config.template,
          variables: { config: this.config },
          entity_ids: this.config.entity_ids,
        }
      );
    }

    this._finishSetup();
  }

  getCardSize() {
    return 1;
  }

  static get styles() {
    return css`
      :host {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        // --face-color: #FFF;
        // --face-border-color: #FFF;
        // --clock-hands-color: #000;
        // --clock-seconds-hand-color: #FF4B3E;
        // --clock-middle-background: #FFF;
        // --clock-middle-border: #000;
        // --sidebar-background: #FFF;
        // --sidebar-text-color: #000;
        // --sidebar-icon-color: #000;
        // --sidebar-selected-text-color: #000;
        // --sidebar-selected-icon-color: #000;
        background-color:  var(--sidebar-background, var(--paper-listbox-background-color, var(--primary-background-color, #fff)));
      }
      .sidebar-inner {
        padding: 20px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        position: fixed;
        width: 0;
        overflow: hidden auto;
      }
      .sidebarcards {
        margin-top: 20px;
        padding: 20px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }
      h1 {
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 32px;
        line-height: 32px;
        font-weight: 200;
        color: var(--sidebar-text-color, #000);
        cursor: default;
      }
      h1.digitalClock {
        font-size: 78px;
        font-weight: 400;
        line-height: 78px;
        cursor: default;
      }
      h1.digitalClock.with-seconds {
        font-size: 60px;
        font-weight: 400;
        line-height: 60px;
        cursor: default;
      }
      h1.digitalClock.with-title {
        margin-bottom: 0;
        cursor: default;
      }
      h2 {
        margin: 0;
        font-size: 26px;
        line-height: 26px;
        font-weight: 200;
        color: var(--sidebar-text-color, #000);
        cursor: default;
      }
      .template {
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        margin: 20px 0 0 0;
        padding: 20px 0 0 0;
        list-style: none;
        color: var(--sidebar-text-color, #000);
      }
      .template li {
        display: block;
        color: inherit;
        font-size: 18px;
        line-height: 24px;
        font-weight: 300;
        white-space: normal;
      }
      .clock {
        margin: 20px 0;
        position: relative;
        padding-top: calc(100% - 10px);
        width: calc(100% - 10px);
        border-radius: 100%;
        background: var(--face-color, #fff);
        font-family: 'Montserrat';
        border: 5px solid var(--face-border-color, #fff);
        box-shadow: inset 2px 3px 8px 0 rgba(0, 0, 0, 0.1);
      }
      .clock .wrap {
        overflow: hidden;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 100%;
      }
      .clock .minute,
      .clock .hour {
        position: absolute;
        height: 28%;
        width: 6px;
        margin: auto;
        top: -27%;
        left: 0;
        bottom: 0;
        right: 0;
        background: var(--clock-hands-color, #000);
        transform-origin: bottom center;
        transform: rotate(0deg);
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.4);
        z-index: 1;
      }
      .clock .minute {
        position: absolute;
        height: 41%;
        width: 4px;
        top: -38%;
        left: 0;
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.4);
        transform: rotate(90deg);
      }
      .clock .second {
        position: absolute;
        top: -48%;
        height: 48%;
        width: 2px;
        margin: auto;
        left: 0;
        bottom: 0;
        right: 0;
        border-radius: 4px;
        background: var(--clock-seconds-hand-color, #ff4b3e);
        transform-origin: bottom center;
        transform: rotate(180deg);
        z-index: 1;
      }
      .clock .dot {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 12px;
        height: 12px;
        border-radius: 100px;
        background: var(--clock-middle-background, #fff);
        border: 2px solid var(--clock-middle-border, #000);
        border-radius: 100px;
        margin: auto;
        z-index: 1;
      }
      .bottom {
        display: flex;
        margin-top: auto;
      }
    `;
  }

  // ##########################################################################################
  // ###   The default CSS of the Sidebar Card element
  // ##########################################################################################

  createCSS(width: number): string {
    const sidebarResponsive = typeof this.config.width === 'object';
    const headerHeightPx = getHeaderHeightPx();

    const breakType = this.getBreakpoint(width);
    const sidebarWidth = this.getWidth(breakType);
    const contentWidth = 100 - sidebarWidth;
    // create css
    let css = `
    #customSidebarWrapper { 
      display:flex;
      flex-direction:row;
      overflow:hidden;
    }
    #customSidebar.hide {
      display:none!important;
      width:0!important;
    }
    #view.hideSidebar {
      width:100%!important;
    }
  `;
    if (sidebarResponsive) {
      css += `
      #customSidebar {
        width:${sidebarWidth}%;
        overflow:hidden;
        ${sidebarWidth == 0 ? "display:none;" : ""}
        ${this.config.hideTopMenu ? '' : 'margin-top: calc(' + headerHeightPx + ' + env(safe-area-inset-top));'}
      } 
      #view {
        width: ${contentWidth}%;
        ${this.config.hideTopMenu ? 'padding-top:0!important;margin-top:0!important;' : ''}
      }
    `;
    } else {
      css += `
      #customSidebar {
        width: ${sidebarWidth}%;
        overflow:hidden;
        ${this.config.hideTopMenu ? '' : 'margin-top: calc(' + headerHeightPx + ' + env(safe-area-inset-top));'}
      } 
      #view {
        width: ${contentWidth}%;
        ${this.config.hideTopMenu ? 'padding-top:0!important;margin-top:0!important;' : ''}
      }
    `;
    }
    return css;
  }
}

// hides (if requested) the HA header, HA footer and/or HA sidebar and hides this sidebar if configured so
function updateStyling(appLayout: HTMLElement, card: SidebarCard) {
  const width = document.body.clientWidth;
  appLayout.querySelector('#customSidebarStyle')!.textContent = card.createCSS(width);

  const root = getRoot();
  const hassHeader = root.shadowRoot!.querySelector<HTMLElement>('.header');
  log2console('updateStyling', hassHeader ? 'Home Assistant header found!' : 'Home Assistant header not found!');
  const hassFooter = root.shadowRoot!.querySelector<HTMLElement>('ch-footer') || root.shadowRoot!.querySelector('app-footer');
  log2console('updateStyling', hassFooter ? 'Home Assistant footer found!' : 'Home Assistant footer not found!');
  const offParam = getParameterByName('sidebarOff');
  const view = root.shadowRoot!.getElementById('view');
  const headerHeightPx = getHeaderHeightPx();

  const sidebarConfig = card.config;
  if (sidebarConfig.hideTopMenu === true && sidebarConfig.showTopMenuOnMobile === true && card.getBreakpoint(width) === 'mobile' && offParam == null) {
    if (hassHeader) {
      log2console('updateStyling', 'Action: Show Home Assistant header!');
      hassHeader.style.display = 'block';
    }
    if (view) {
      view.style.minHeight = 'calc(100vh - ' + headerHeightPx + ')';
    }
    if (hassFooter) {
      log2console('updateStyling', 'Action: Show Home Assistant footer!');
      hassFooter.style.display = 'flex';
    }
  } else if (sidebarConfig.hideTopMenu && sidebarConfig.hideTopMenu === true && offParam == null) {
    if (hassHeader) {
      log2console('updateStyling', 'Action: Hide Home Assistant header!');
      hassHeader.style.display = 'none';
    }
    if (hassFooter) {
      log2console('updateStyling', 'Action: Hide Home Assistant footer!');
      hassFooter.style.display = 'none';
    }
    if (view) {
      view.style.minHeight = 'calc(100vh)';
    }
  }
}

// watch and handle the resize and location-changed events
function subscribeEvents(appLayout: HTMLElement, card: SidebarCard, contentContainer: Element, sidebar: HTMLElement) {
  window.addEventListener(
    'resize',
    function () {
      updateStyling(appLayout, card);
    },
    true
  );

  const sidebarConfig = card.config;
  if (sidebarConfig.hideOnPath) {
    window.addEventListener('location-changed', () => {
      if (sidebarConfig.hideOnPath?.includes(window.location.pathname)) {
        contentContainer.classList.add('hideSidebar');
        sidebar.classList.add('hide');
      } else {
        contentContainer.classList.remove('hideSidebar');
        sidebar.classList.remove('hide');
      }
    });

    if (sidebarConfig.hideOnPath?.includes(window.location.pathname)) {
      log2console('subscribeEvents', `Disabled sidebar for this path: ${window.location.pathname}`);
      contentContainer.classList.add('hideSidebar');
      sidebar.classList.add('hide');
    }
  }
}

async function watchLocationChange() {
  window.addEventListener('location-changed', () => {
    const root = getRoot();
    if (!root) return; // location changed before finishing dom rendering
    const appLayout = root.shadowRoot!.querySelector('div');
    const customSidebarWrapper = appLayout!.querySelector('#customSidebarWrapper');
    if (!customSidebarWrapper) {
      buildSidebar();
    }
  });
}

function createElementFromHTML(htmlString: string) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

// ##########################################################################################
// ###   The Sidebar Card code base initialisation
// ##########################################################################################

async function buildSidebar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lovelace: any = await getConfig();

  if (lovelace && lovelace.config.sidebar) {
    const sidebarConfig: SidebarConfig = Object.assign({}, DEFAULT_CONFIG, lovelace.config.sidebar);
    const root = getRoot();
    const hassSidebar = getSidebar();
    const appDrawerLayout = getAppDrawerLayout();
    const appDrawer = getAppDrawer();
    const offParam = getParameterByName('sidebarOff');

    if (sidebarConfig.hideTopMenu === true && offParam == null) {
      if (root.shadowRoot!.querySelector('ch-header'))
        root.shadowRoot!.querySelector<HTMLElement>('ch-header')!.style.display = 'none';
      if (root.shadowRoot!.querySelector('app-header'))
        root.shadowRoot!.querySelector<HTMLElement>('app-header')!.style.display = 'none';
      if (root.shadowRoot!.querySelector('ch-footer'))
        root.shadowRoot!.querySelector<HTMLElement>('ch-footer')!.style.display = 'none';
      if (root.shadowRoot!.getElementById('view'))
        root.shadowRoot!.getElementById('view')!.style.minHeight = 'calc(100vh)';
    }
    if (sidebarConfig.hideHassSidebar === true && offParam == null) {
      if (hassSidebar) {
        hassSidebar.style.display = 'none';
      }
      if (appDrawerLayout) {
        appDrawerLayout.style.marginLeft = '0';
        appDrawerLayout.style.paddingLeft = '0';
      }
      if (appDrawer) {
        appDrawer.style.display = 'none';
      }
    }
    const sidebarCard = document.createElement('sidebar-card') as SidebarCard;
    sidebarCard.hass = hass();
    sidebarCard.setConfig(sidebarConfig);

    const appLayout = root.shadowRoot!.querySelector<HTMLElement>('div');
    const css = sidebarCard.createCSS(document.body.clientWidth);
    const style: HTMLStyleElement = document.createElement<'style'>('style');
    style.setAttribute('id', 'customSidebarStyle');
    appLayout!.appendChild(style);
    // style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    // get element to wrap
    const contentContainer = appLayout!.querySelector('#view');
    // create wrapper container
    const wrapper = document.createElement('div');
    wrapper.setAttribute('id', 'customSidebarWrapper');
    // insert wrapper before el in the DOM tree
    contentContainer?.parentNode!.insertBefore(wrapper, contentContainer);
    // move el into wrapper
    const sidebar = document.createElement('div');
    sidebar.setAttribute('id', 'customSidebar');
    sidebar.appendChild(sidebarCard);
    wrapper.appendChild(sidebar);
    if (contentContainer) {
      wrapper.appendChild(contentContainer);
    }
    //updateStyling(appLayout, sidebarConfig);
    subscribeEvents(appLayout!, sidebarCard, contentContainer!, sidebar);
    updateStyling(appLayout!, sidebarCard);
  } else {
    log2console('buildSidebar', 'No sidebar in config found!');
  }
}

if (!customElements.get("sidebar-card")) {
  customElements.define('sidebar-card', SidebarCard);
  console.info(
    `%c  ${SIDEBAR_CARD_TITLE.padEnd(24)}%c
    Version: ${SIDEBAR_CARD_VERSION.padEnd(9)}      `,
    'color: chartreuse; background: black; font-weight: 700;',
    'color: white; background: dimgrey; font-weight: 700;'
    );
}

await buildSidebar();
await watchLocationChange();
