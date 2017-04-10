/* DORA -- the fast-trips EXPLORAH. */
'use strict';

var mymap = L.map('sfmap').setView([37.75, -122.3], 11);
var url = 'https://api.mapbox.com/styles/v1/mapbox/dark-v9/tiles/256/{z}/{x}/{y}?access_token={accessToken}';
var token = 'pk.eyJ1IjoicHNyYyIsImEiOiJjaXFmc2UxanMwM3F6ZnJtMWp3MjBvZHNrIn0._Dmske9er0ounTbBmdRrRQ';
var attribution ='<a href="http://openstreetmap.org">OpenStreetMap</a> | '+
                 '<a href="http://mapbox.com">Mapbox</a>';
L.tileLayer(url, {
  attribution:attribution,
  maxZoom: 18,
  accessToken:token,
}).addTo(mymap);

var personJson;
var segmentLayer;

var options = {
  typeName: 'mappoints:segments0',
  service:'WFS',
  version:'1.1.0',
  request:'GetFeature',
  outputFormat: 'json',
};

function addSegmentLayer(segments) {
  segmentLayer = L.geoJSON(segments, {
    style: function(feature) {
      switch (feature.properties.mode) {
        case 'heavy_rail': return {color: "#ffff00"};
        case 'commuter_rail': return {color: "#ff6666"};
        case 'light_rail': return {color: "red"};
        case 'local_bus': return {color: "#00ccff", "z-index":"20"};
        case 'premium_bus': return {color: "#44ffaa"};
        case 'express_bus': return {color: "#44ffaa"};
        case 'ferry': return {color: "#ff8800"};
        case 'transfer': return {color: "#446600", "z-index":"-1"};
        default: return {color: "#446600", "z-index":"-1"};
      }
    }
  });
  segmentLayer.addTo(mymap);
}

function highlightTrip() {
  app.selectedPaths = [];
  let clone = JSON.parse(JSON.stringify(personJson));
  let allTrips = clone.features;
  let thisTrip = [];
  for (let trip of allTrips) {
    if (''+trip.properties.person_trip_id === ''+app.selectedTrips) thisTrip.push(trip);
  }
  clone.features = thisTrip;

  if (segmentLayer) segmentLayer.remove();
  addSegmentLayer(clone);

  updatePathList(clone);
}

function highlightPath() {
  if (app.selectedPaths.length==0) return;

  let clone = JSON.parse(JSON.stringify(personJson));
  let allTrips = clone.features;
  let thisPath = [];
  for (let trip of allTrips) {
    if (''+trip.properties.person_trip_id === ''+app.selectedTrips &&
        ''+trip.properties.pathnum === ''+app.selectedPaths) {
      thisPath.push(trip);
    }
  }
  clone.features = thisPath;

  if (segmentLayer) segmentLayer.remove()
  addSegmentLayer(clone);
}

function updateTripList(segments) {
    let tripset = {};
    for (var feature of segments.features) {
        let tripId = feature.properties.person_trip_id;
        tripset[feature.properties.person_trip_id]=null;
    }
    let tripArray = Object.keys(tripset);
    tripArray.sort(function(a, b) {return a-b});
    app.trips = []
    for (var t of tripArray) {
        app.trips.push({trip_id:t});
    }
}

function updatePathList(segments) {
    let pathset = {};
    for (var feature of segments.features) {
        let path = feature.properties.pathnum;
        pathset[feature.properties.pathnum]=null;
    }
    let pathArray = Object.keys(pathset);
    pathArray.sort(function(a, b) {return a-b});
    app.paths.value='';
    for (var p of pathArray) {
        app.paths.push({pathnum:p});
    }
}

function queryServer() {
  const geoserverUrl = 'http://dwdev:8080/geoserver/ows?';

  var esc = encodeURIComponent;
  var queryparams = Object.keys(options)
            .map(k => esc(k) + '=' + esc(options[k]))
            .join('&');

  // Fetch the segments
  fetch(geoserverUrl + queryparams, options)
    .then((resp) => resp.json())
    .then(function(jsonData) {
      personJson = jsonData;
      addSegmentLayer(jsonData);
      updateTripList(jsonData);
    }).catch(function(error) {
      console.log("err: "+error);
    });
}

function runFilter() {
  if (segmentLayer) segmentLayer.remove()

  if (this.person) options['cql_filter'] = `person_id='${this.person}'`
  else return;

  queryServer();
}

var app = new Vue({
  el: '#panel',
  data: {
	person: '',
    trips: [],
    paths: [],
    selectedTrips: [],
    selectedPaths: [],
  },
  methods: {
    queryServer: queryServer,
    runFilter: runFilter,
  },
  watch: {
    selectedTrips: highlightTrip,
    selectedPaths: highlightPath,
  },
});

