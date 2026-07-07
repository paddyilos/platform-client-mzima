import { divIcon, marker } from 'leaflet';

export const pointIcon = (color: string, type: string = 'default') => {
  // Test string to make sure that it does not contain injection
  color = color && /^[a-zA-Z0-9#]+$/.test(color) ? `#${color}` : 'var(--color-neutral-100)';
  const size: any = [30, 40];
  // var iconicSprite = require('ushahidi-platform-pattern-library/assets/img/iconic-sprite.svg');

  return divIcon({
    className: 'custom-map-marker',
    html: `
    <svg class="iconic" style="height: 100%; width: 100%; fill:${color};">
      <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="assets/markers.svg#${type}"></use>
    </svg>
    <span class="iconic-bg" style="background-color:${color};"></span>
    `,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, 0 - size[1]],
  });
};

export const pointToLayer = (feature: any, latlng: any) => {
  return marker(latlng, {
    icon: pointIcon(feature.properties['marker-color']),
  });
};

export const osmStreetsTiles = (name: string, code: string, visible = true) => {
  return {
    name,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    layerOptions: {
      maxZoom: 19,
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    },
    visible,
    code,
  };
};

export const esriSatelliteTiles = (name: string, code: string, visible = true) => {
  return {
    name,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    layerOptions: {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    visible,
    code,
  };
};

export const getMapLayers = () => {
  return {
    baselayers: {
      satellite: esriSatelliteTiles('Satellite', 'satellite'),
      MapQuestAerial: esriSatelliteTiles('Satellite', 'MapQuestAerial', false),
      streets: osmStreetsTiles('Streets', 'streets'),
      MapQuest: osmStreetsTiles('Streets', 'MapQuest', false),
      hOSM: {
        name: 'Humanitarian',
        url: '//{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        layerOptions: {
          attribution:
            '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>, &copy; <a href="http://hot.openstreetmap.org/">Humanitarian OpenStreetMap</a>',
        },
        visible: true,
        code: 'hOSM',
      },
    },
  };
};
