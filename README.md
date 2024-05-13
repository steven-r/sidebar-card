[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

# Sidebar card [WIP]
This card adds a sidebar to your interface which you can configure globally so every page has the sidebar. It can replace your top navigation but can also give extra functionality.

This fork ist based on the work from https://github.com/DBuit/sidebar-card. You might get him a coffee: 

<a href="https://www.buymeacoffee.com/ZrUK14i" target="_blank"><img height="41px" width="167px" src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee"></a>

## Installation instructions

**HACS installation**

Go to the hacs store and use the repo url `https://github.com/steven-r/sidebar-card` and add this as a custom repository under settings. This should be it.

**Manual installation:**

Copy the .js file from the dist directory to your www directory and add the following to your ui-lovelace.yaml file:

```yaml
resources:
  url: /local/sidebar-card.js
  type: module
```

## Configuration

The YAML configuration happens at the root of your Lovelace config under `sidebar:` at the same level as `resources:` and `views:`.

Example:
```
sidebar:
  title: "Sidebar title"
views:
....
```

### Main Options

Under `sidebar` you can configure the following options:

| Name | Type | Default | Supported options | Description |
| -------------- | ----------- | ------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | string | optional | _`string`_ | Title to show in the sidebar |
| `clock` | boolean | optional | `true` | Show analog clock in sidebar |
| `digitalClock` | boolean | optional | `true` | Show digital clock in sidebar |
| `digitalClockWithSeconds` | boolean | optional | `true` | If digitalClock is enabled you can also enable to show seconds |
| `twelveHourVersion` | boolean | optional | `false` | If digitalClock is enabled you can also enable this to 12 hour version |
| `period` | boolean | optional | `false` | If twelveHourVersion is enabled you can enable this to show 'AM' or 'PM' |
| `date` | boolean | optional | `false` | If date is enabled it will display the current date |
| `dateFormat` | boolean | string | `DD` | If date is enabled you define how it should show the date with dateFormat, to see the options check [this](https://moment.github.io/luxon/#/formatting?id=table-of-tokens). |
| `width` | object | optional | see info below | The width of the sidebar in percentages for different screens (see section [Widths](#Width) below). |
| `hideTopMenu` | boolean | optional | `true` | Hide the top home assistant menu |
| `hideHassSidebar` | boolean | optional | `true` | Hide the home assistant sidebar |
| `showTopMenuOnMobile` | boolean | optional | `true` | If you hide the top menu you can set this to `true` so that it will be shown on mobile |
| `breakpoints` | object | optional | see info below | For the width we set different sizes for different screens with breakpoints you can overwrite these breakpoints |
| `cards` | card-list | optional | Any card | Card which aer displyed on the sidebar (see section [Cards](#Cards) below |
| `style` | css | optional | see info below | Overwrite some color variables or write your own styles |
| `bottomCard` | object | optional | see info below | Define any card that will be rendered at the bottom of the sidebar |
| `hideOnPath` | array | optional | - /lovelace/camera | If you don't want the sidebar on every path you can add a list of paths where it should hide the sidebar |
| `debug` | boolean | optional | `false` | Show debugging messages in the browser's developer console |


When using `hideTopMenu` and/or `hideHassSidebar` you can disable this behavior by adding `?sidebarOff` to the url.
For example: 
```
https://<myhass-url>/lovelace/home?sidebarOff
```

### Width

The width of the sidebar can be controlled default it will be `25%` of the width on all screens.
with the `width` option you can set the width for 3 sizes mobile, tablet and desktop.
You can also set the width to 0 to make the sidebar not appear.

Example to set width (This example hides the sidebar on mobile):

```
sidebar:
  width:
    mobile: 0
    tablet: 25
    desktop: 20
```

### Breakpoints

Above we have set the width for 3 sizes but you can also set the breakpoints for these sizes to change the moment it changes.
the breakpoint is activated when the width is smaller or equal to the value that is set.
Default mobile is 768px or smaller, tablet 1024px or smaller and above 1024 is desktop.

Example to set breakpoints:

```
sidebar:
  breakpoints:
    mobile: 768
    tablet: 1024
```

### Cards

You can add cards to the sidebar by adding card definitios to the `cards` option.

For example:
```
sidebar:
  ...
  cards:
    - type: weather-forecast
      show_current: true
      show_forecast: false
      entity: weather.apple_weather
      forecast_type: daily
      name: Wetter
      card_mod:
        style:
          . : |
            ha-card {
              border: 0;
            }
```

#### "sidebar-template" card type

The `sidebar.template` card give you a place to template a list of messages that can be shown.
Every message must start with `<li>` and end with `</li>` within you can template your message.

Below some examples i have to say Goedemorgen == Good morning for non dutch people 
Or display how much lights or media_players are on etc.

```
sidebar:
  template: |
    <li>
      {% if now().hour  < 5 %} Goede nacht {{'\U0001F634'}}
      {% elif now().hour < 12 %} Goedemorgen {{'\u2615\uFE0F'}}
      {% elif now().hour < 18 %} Goedenmiddag {{'\U0001F44B\U0001F3FB'}}
      {% else %} Goedenavond {{'\U0001F44B\U0001F3FB'}}{% endif %}
    </li>
    {% if "Vandaag" in states('sensor.blink_gft') %} <li>Vandaag groenebak aan de straat</li> {% endif %}
    {% if "Vandaag" in states('sensor.blink_papier') %} <li>Vandaag oudpapier aan de straat</li> {% endif %}
    {% if "Vandaag" in states('sensor.blink_pmd') %} <li>Vandaag plastic aan de straat</li> {% endif %}
    {% if "Vandaag" in states('sensor.blink_restafval') %} <li>Vandaag grijzebak aan de straat</li> {% endif %}
    {% if "Morgen" in states('sensor.blink_gft') %} <li>Morgen groenebak aan de straat</li> {% endif %}
    {% if "Morgen" in states('sensor.blink_papier') %} <li>Morgen oudpapier aan de straat</li> {% endif %}
    {% if "Morgen" in states('sensor.blink_pmd') %} <li>Morgen plastic aan de straat</li> {% endif %}
    {% if "Morgen" in states('sensor.blink_restafval') %} <li>Morgen grijzebak aan de straat</li> {% endif %}
    {% if states('sensor.current_lights_on') | float > 0 %} <li>{{states('sensor.current_lights_on')}} lampen aan</li> {% endif %}
    {% if states('sensor.current_media_players_on') | float > 0 %} <li>{{states('sensor.current_media_players_on')}} speakers aan</li> {% endif %}
```

##### style

Default there are some variables that you can set to changes colors.
Of course you can also add your own styles to customize it more.
Below in the example you can find the variables with the default colors

Example:

```
sidebar:
  style: |
    :host {
        --sidebar-background: #FFF;
        --sidebar-text-color: #000;
        --face-color: #FFF;
        --face-border-color: #FFF;
        --clock-hands-color: #000;
        --clock-seconds-hand-color: #FF4B3E;
        --clock-middle-background: #FFF;
        --clock-middle-border: #000;
    }

```

### Screenshots

Default:

![Screenshot default](screenshot-default.png)

Styled:

![Screenshot styled](screenshot-styled.png)