/*
 * ShakeMap 3.0 - jQuery plugin for creating Google Maps, based on jMapping plugin created by Brian Landau (Viget Labs)
 * Minimus jQuery Library: 1.4.x
 *
 * Copyright (c) 2013 Giovanni Buffa
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 */
 
 //Global settings to handle multiple instance of the map in the same page.
jQuery.skmap = {
  mapHash:[],
  markerManager:[],
  markers:[],
  gmarkers:[],
  infowindows:[],
  rawPosition:[],
  oms:[]
};

(function($){
  var settings, points, totalMarker, clusterOptions, bounds, activeMap, userIcon;
  var setup = {
    makeLatLng:function(point){
      return new google.maps.LatLng(point[1], point[0]);
    },
    getBounds:function(){
      var bounds, initialPoint, lenPoints;
      if(totalMarker){
        initialPoint = setup.makeLatLng(points.features[0].geometry.coordinates)
      }else{
        initialPoint = setup.makeLatLng(setting.defaultPoint);
      }
      bounds = new google.maps.LatLngBounds(initialPoint, initialPoint);
      lenPoints = points.features.length;
      for(var i = 1, len = lenPoints; i < len; i++){
        bounds.extend(setup.makeLatLng(points.features[i].geometry.coordinates));
      }
      return bounds;
    },
    addMarker:function(target, element){
      var point, marker, mid;
      mid = settings.sidebar.mid;
      point = setup.makeLatLng(element.geometry.coordinates);
      if($.isEmptyObject(settings.categoryIcons.options)){
        marker = new google.maps.Marker({
          position:point,
          map:$.skmap.mapHash[api.getMap(target)].map
        })
      }else{
        category = settings.categoryIcons.field_name;
        icon_options = setup.markerIcon(settings.categoryIcons, element.properties[category]);
        marker = new google.maps.Marker({
          icon:icon_options,
          position:point,
          map:$.skmap.mapHash[api.getMap(target)].map
        });
      }
      
      //add information to the marker if its loaded from a JSON
      if(element.properties.description){
        marker.desc = element.properties.description;
      }
      
      switch(settings.action){
        case "infowindow":
          var infowindow = new google.maps.InfoWindow({
            content: marker.desc
          });
          if(!$.isEmptyObject(settings.infowindowOptions)){
            infowindow.setOptions(settings.infowindowOptions);
          }
          $.skmap.infowindows[api.getMap(target)].push(infowindow);
          google.maps.event.addListener(marker, 'click', function(){
            $.each($.skmap.infowindows[api.getMap(target)], function(index, iwindow){
              if(infowindow != iwindow){iwindow.close();}
            });
            infowindow.open($.skmap.mapHash[api.getMap(target)].map, marker);
          });
        break;
        
        case "direct":
          google.maps.event.addListener(marker, 'click', function(){
            settings.markerClick(this);
          });
        break;
        
        case "infobox":
          var infobox = new InfoBox(api.setInfobox(marker.desc));
          $.skmap.infowindows[api.getMap(target)].push(infobox);
          google.maps.event.addListener(marker, 'click', function(){
            $.each($.skmap.infowindows[api.getMap(target)], function(index, iwindow){
              if(infobox != iwindow){
                iwindow.close();
              }
            });
            infobox.open($.skmap.mapHash[api.getMap(target)].map, marker);
          });
        break;
        
        case 'null':
          return;
        break;
      }
      if(settings.sidebar.active == true){
        $.skmap.gmarkers[api.getMap(target)][parseInt(element.properties[mid], 10)] = marker;
        api.attachEvent(target);
      }
      
      return marker;
    },
    markerIcon:function(options, category){
      var iconObj, icon, url, size, origin, anchor, image;
      icon = options.options;
      url = icon[category];
      size = options.size;
      origin = options.origin;
      anchor = options.anchor;
      
      image = new google.maps.MarkerImage(
        url,
        new google.maps.Size(size[0], size[1]),
        new google.maps.Point(origin[0], origin[1]),
        new google.maps.Point(anchor[0], anchor[1])
      );
      return image;
    },
    updateClusterer:function(){
      markerManager.addMarkers(marker);
    },
    geolocationError:function(error){
      settings.geolocation.onError(error);
    },
    geolocationFormatIcon:function(target){
      var icon, coordinates, userCoordinates;
      icon = settings.categoryIcons.field_name;
      userCoordinates = [];
      if(settings.geolocation.manualCoords.length > 0){
        userCoordinates[0] = settings.geolocation.manualCoords[1];
        userCoordinates[1] = settings.geolocation.manualCoords[0];
      }else{
        userCoordinates = [
          $.skmap.rawPosition[api.getMap(target)].longitude,
          $.skmap.rawPosition[api.getMap(target)].latitude
        ]
      }
      coordinates = {
        "type":"Feature",
        'geometry':{
          'type':'Point',
          'coordinates':userCoordinates
        },
        'properties':{
          'name':'',
          'description':'',
          'nid':''
        }
      }
      coordinates.properties[icon] = 'user';
      return coordinates;
    },
    map:function(target){
      var mapOptions, customMaptype, customStyle, styledMapOptions, customMap;
      mapOptions = {
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.DEFAULT
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 18,
        zoom: 9
      }
      $.extend(mapOptions, settings.mapOptions);
      
      google.maps.visualRefresh = true;
      
      if(settings.mapStyle.length > 0){
        customMaptype = 'custom';
        mapOptions.mapTypeControlOptions = {mapTypeIds : [google.maps.MapTypeId.ROADMAP, customMaptype]};
        mapOptions.mapTypeId = customMaptype;
        customStyle = settings.mapStyle;
        styledMapOptions = {
          name:"custom"
        }
        customMap = new google.maps.StyledMapType(customStyle, styledMapOptions);
        activeMap = new google.maps.Map(target, mapOptions);
        activeMap.mapTypes.set(customMaptype, customMap);
      }else{
        activeMap = new google.maps.Map(target, mapOptions);
      }
      
      if(totalMarker > 1){
        activeMap.fitBounds(bounds);
      }else{
        activeMap.setCenter(new google.maps.LatLng(points.features[0].geometry.coordinates[1], points.features[0].geometry.coordinates[0]));
      }
      var mapInfo = {
        map:'',
        mapKey:''
      }
      mapInfo.map = activeMap;
      mapInfo.mapKey = target;
      $.skmap.mapHash.push(mapInfo);
    },
    set:function(target, update){
      if(update){
        if($.skmap.rawPosition[api.getMap(target)]){
          points.features.push(setup.geolocationFormatIcon(target));
        }
      }else{
        $.skmap.gmarkers.push(new Object);
        $.skmap.infowindows.push(new Array);
      }
      
      totalMarker = points.features.length;
      bounds = setup.getBounds();
      
      if(update){
        $.skmap.markers[api.getMap(target)] = [];
        $.skmap.markerManager[api.getMap(target)].clearMarkers();
        $.skmap.mapHash[api.getMap(target)].map.fitBounds(bounds);
        if(settings.spider === true){
          $.skmap.oms[api.getMap(target)].clearMarkers();
        }
      }else{
        $.skmap.markers.push(new Array);
        //init map
        setup.map(target);
        if(settings.spider === true){
          //$.skmap.oms[api.getMap(target)] = new Array;
          $.skmap.oms[api.getMap(target)] = new OverlappingMarkerSpiderfier($.skmap.mapHash[api.getMap(target)].map, {markersWontMove: true, markersWontHide: true});
          //add markers
          for(var i = 0; i < totalMarker; i++){
            $.skmap.markers[api.getMap(target)].push($.skmap.oms[api.getMap(target)].addMarker(setup.addMarker(target, points.features[i])));
          }
          //init clusterer
          $.skmap.markerManager.push(new MarkerClusterer($.skmap.mapHash[api.getMap(target)].map, $.skmap.oms[api.getMap(target)].getMarkers(), clusterOptions));
        }else{
          //add markers
          for(var i = 0; i < totalMarker; i++){
            $.skmap.markers[api.getMap(target)].push(setup.addMarker(target, points.features[i]));
          }
          //init clusterer
          $.skmap.markerManager.push(new MarkerClusterer($.skmap.mapHash[api.getMap(target)].map, $.skmap.markers[api.getMap(target)], clusterOptions));
        }
        
        if($.skmap.markers[api.getMap(target)].length == 1 && settings.autoOpen){
          google.maps.event.trigger($.skmap.markers[api.getMap(target)][0], 'click');
        }
      }
      
      if(update){
        if(settings.spider === true){
          $.skmap.oms[api.getMap(target)] = new OverlappingMarkerSpiderfier($.skmap.mapHash[api.getMap(target)].map, {markersWontMove: true, markersWontHide: true});
          //regenerate markers
          for(var i = 0; i < totalMarker; i++){
            $.skmap.markers[api.getMap(target)].push($.skmap.oms[api.getMap(target)].addMarker(setup.addMarker(target, points.features[i])));
          }
          //re-init clusterer
          $.skmap.markerManager.push(new MarkerClusterer($.skmap.mapHash[api.getMap(target)].map, $.skmap.oms[api.getMap(target)].getMarkers(), clusterOptions));
        }else{
          //regenerate markers
          for(var i = 0; i < totalMarker; i++){
            $.skmap.markers[api.getMap(target)].push(setup.addMarker(target, points.features[i]));
          }
          //re-init clusterer
          $.skmap.markerManager[api.getMap(target)] = new MarkerClusterer($.skmap.mapHash[api.getMap(target)].map, $.skmap.markers[api.getMap(target)], clusterOptions);
        }
      }else{
        google.maps.event.addListener($.skmap.markerManager[api.getMap(target)], 'loaded', function(){
          updateClusterer();
        });
      }
      
      //draggable events
      if(totalMarker == 1 && settings.draggable.active === true){
        settings.action = null;
        var marker = $.skmap.markers[api.getMap(target)][0];
        marker.setDraggable(true);
        google.maps.event.addListener(marker, 'dragstart', function(){
          settings.draggable.dragstart(this.getPosition());
        });
        google.maps.event.addListener(marker, 'drag', function(){
          settings.draggable.drag(this.getPosition());
        });
        google.maps.event.addListener(marker, 'dragend', function(){
          settings.draggable.dragend(this.getPosition());
        });
      }
      
      //geolocation event
      if(settings.geolocation.active === true){
        google.maps.event.addListenerOnce($.skmap.mapHash[api.getMap(target)].map, 'idle', function(){
          if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(function(position){
              var userPosition, userMarker, geocoder;
              $.skmap.rawPosition[api.getMap(target)] = position.coords;
              userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
              $.skmap.mapHash[api.getMap(target)].map.setCenter(userPosition);
              $.skmap.mapHash[api.getMap(target)].map.setZoom(10);
              userMarker = setup.makeLatLng([position.coords.longitude, position.coords.latitude]);
              userIcon = new google.maps.Marker({
                position:userMarker,
                icon:settings.geolocation.marker,
                map:activeMap
              });
              $.skmap.markers[api.getMap(target)].push(userIcon);
              $.skmap.markerManager[api.getMap(target)].clearMarkers();
              $.skmap.markerManager[api.getMap(target)] = new MarkerClusterer($.skmap.mapHash[api.getMap(target)].map, $.skmap.markers[api.getMap(target)], clusterOptions);
              geocoder = new google.maps.Geocoder();
              geocoder.geocode({'latLng':userPosition}, function(result, status){
                if(status == google.maps.GeocoderStatus.OK){
                  settings.geolocation.onGeolocation($.skmap.mapHash[api.getMap(target)].map, $.skmap.rawPosition[api.getMap(target)], result);
                }
              });
            }, setup.geolocationError);
          }else{
            setup.geolocationError({code:0});
          }
        })
      }
    },
    init:function(target, settings, update){
      clusterOptions = {gridSize:settings.clusterer.grid_size, maxZoom: settings.clusterer.max_zoom, styles:settings.clusterer.style};
      if(settings.data != "" || typeof settings.data == 'object'){
        if(typeof settings.data == 'string'){
          $.getJSON(settings.data, function(data){
            points = data;
            setup.set(target, update);
          });
        }else{
          points = settings.data;
          setup.set(target, update);
        }
      }else{
        console.log('Please, insert a valid geoJSON url or passing a geoJSON Object!');
      }
    }
  },
  api = {
    getMap:function(target){
      for(var i = 0; i < $.skmap.mapHash.length; i++){
        if($.skmap.mapHash[i].mapKey == target){
          return i;
        }
      }
    },
    setInfobox:function(content){
      var infoOptions, offset;
      offset = settings.infoboxSettings.offset;
      infoOptions = {
        content: content,
        disableAutoPan: false,
        maxWidth: 0,
        pixelOffset: new google.maps.Size(offset[0], offset[1]),
        zIndex: null,
        boxStyle:{
          background: "url("+settings.infoboxSettings.background+") left top no-repeat",
          opacity: 1,
          width:settings.infoboxSettings.width,
          height:settings.infoboxSettings.height
        },
        closeBoxMargin: settings.infoboxSettings.closeBoxMargin,
        closeBoxURL: settings.infoboxSettings.closeBoxURL,
        infoBoxClearance: new google.maps.Size(1, 1),
        isHidden: false,
        pane: "floatPane",
        enableEventPropagation: false
      }
      
      return infoOptions;
    },
    attachEvent:function(target){
      $('a.open-infowindow', settings.sidebar.target).die('click');
      $('a.open-infowindow', settings.sidebar.target).live('click', function(){
        var markerIndex = parseInt($(this).data('marker'), 10);
        google.maps.event.trigger($.skmap.gmarkers[api.getMap(target)][markerIndex], 'click');
        $.skmap.mapHash[api.getMap(target)].map.setCenter($.skmap.gmarkers[api.getMap(target)][markerIndex].getPosition());
        $.skmap.mapHash[api.getMap(target)].map.setZoom(15);
        return false;
      });
    }
  },
  methods = {
    init:function(options){
      settings = {
        data:"", //string, object
        action:"infowindow", //infowindow, infobox, direct, null
        markerClick:function(marker){},
        autoOpen:false, //used only with one marker
        spider:false,
        sidebar:{
          active:false,
          mid:null,
          target:""
        },
        defaultPoint:{
          lat:0,
          lng:0
        },
        clusterer:{
          grid_size:50,
          max_zoom:15,
          style:[]
        },
        categoryIcons:{
          field_name:"",
          options:{},
          size:[32,32],
          origin:[0,0],
          anchor:[0,0]
        },
        geolocation:{
          active:false,
          marker:"",
          manualCoords:[],
          onGeolocation:function(map, position, result){},
          onError:function(error){}
        },
        draggable:{
          active:false,
          dragstart:function(position){},
          drag:function(position){},
          dragend:function(position){}
        },
        infowindowOptions:{},
        infoboxSettings:{
          offset:[0,0],
          width:"",
          height:"",
          background:"",
          closeBoxMargin:"0 0 0 0",
          closeBoxURL:""
        },
        mapOptions:{},
        mapStyle:[]
      };
      
      return this.each(function(){
        var action;
        if(options){
          if(typeof options[1] == 'object'){
            action = options[0];
            $.extend(settings, options[1]);
          }else{
            $.extend(settings, options);
          }
        }
        setup.init(this, settings, action);
      })
    },
    destroy:function(){
      this.each(function(){
        //var parent = jQuery(this).parent();
        var clone = jQuery(this).empty().removeAttr('style').clone(false);
        var hash = api.getMap(this);
        
        $.skmap.mapHash.splice(hash, 1);
        $.skmap.markerManager.splice(hash, 1);
        $.skmap.markers.splice(hash, 1);
        $.skmap.gmarkers.splice(hash, 1);
        $.skmap.infowindows.splice(hash, 1);
        $.skmap.rawPosition.splice(hash, 1);
        $.skmap.oms.splice(hash, 1);
        $(this).replaceWith(clone);
      })
    }
  };
  
  $.fn.shakemap = function(method){
    switch(method){
      case 'update':
        return methods.init.apply(this, [arguments]);
      break;
      
      case 'destroy':
        return methods.destroy.apply(this);
      break;
      
      default:
        return methods.init.apply(this, arguments);
      break;
    }
  }
})(jQuery);	