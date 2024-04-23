interface ItemNumberList {
    [key: string]: number;
}

export interface SidebarConfig {
  showTopMenuOnMobile: boolean;
  hideTopMenu: boolean;
  breakpoints: ItemNumberList;
  desktop: number;
  width: ItemNumberList;
  hideOnPath: string[];
}