/*
 * ShakeMap v2.0 - jQuery plugin for creating Google Maps, based on jMapping plugin created by Brian Landau (Viget Labs)
 *
 * Copyright (c) 2012 Giovanni Buffa
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 */

(function($){
  $.shakeMap = function(map_elm, options){
    var settings, gmarkers, marker, mapped, map, markerManager, places, bounds, boundsJ, shakeMapper, info_windows, points, totalMarker, mcOptions, oms, homePosition;
    map_elm = (typeof map_elm == "string") ? $(map_elm).get(0) : map_elm;

    if(!($(map_elm).data('shakeMap'))){
      settings = $.extend(true, {}, $.shakeMap.defaults);
      $.extend(true, settings, options);

      mcOptions = {gridSize:settings.grid_size, maxZoom: settings.max_zoom, styles:settings.cluster_styles};

      var init = function(doUpdate, data, proxi){
        var min_zoom, zoom_level;
        gmarkers = {};
        marker = [];
        info_windows = [];
        if(doUpdate){
          points = data;
          if(typeof proxi != 'undefined' && proxi.length > 0){
            settings.use_geo = false;
            var icon = settings.category_icon.field_name;
            var coordinates = {
              "type":"Feature",
              'geometry':{
                'type':'Point',
                'coordinates':[proxi[1], proxi[0]]
              },
              'properties':{
                'name':'',
                'description':'',
                'nid':''
              }
            };
            coordinates.properties[icon] = 'user';
            points.features.push(coordinates);
          }
        }else{
          points = settings.data;
        }
        
        if(settings.use_geo == true){
          if(typeof homePosition != 'undefined'){
            var icon = settings.category_icon.field_name;
            var coordinates = {
              "type":"Feature",
              'geometry':{
                'type':'Point',
                'coordinates':[homePosition.longitude, homePosition.latitude]
              },
              'properties':{
                'name':'',
                'description':'',
                'nid':''
              }
            };
            coordinates.properties[icon] = 'user';
            points.features.push(coordinates);
          }
        }
        
        /*if(proxi.length > 0){
          var icon = settings.category_icon.field_name;
          var coordinates = {
            "type":"Feature",
            'geometry':{
              'type':'Point',
              'coordinates':[proxi[1], proxi[0]]
            },
            'properties':{
              'name':'',
              'description':'',
              'nid':''
            }
          };
          coordinates.properties[icon] = 'user';
          points.features.push(coordinates);
        }*/
          
        totalMarker = points.features.length;
        bounds = getBounds(doUpdate);

        if(doUpdate){
          //update
          markerManager.clearMarkers();
          google.maps.event.trigger(map, 'resize');
          map.fitBounds(bounds);
          if(settings.use_spider == true){
            oms.clearMarkers();
          }
        }else{
          //create new map
          map = createMap();
          if(settings.use_spider == true){
            oms = new OverlappingMarkerSpiderfier(map, {markersWontMove: true, markersWontHide: true});
            for(var i = 0; i < totalMarker; i++){
	            marker.push(oms.addMarker(createMarker(points.features[i])));
	          }
	          markerManager = new MarkerClusterer(map, oms.getMarkers(), mcOptions);
	          oms.addListener('click', function(marker) {
              setOmsAction(marker);
            });
	        }else{
            for(var i = 0; i < totalMarker; i++){
	            marker.push(createMarker(points.features[i]));
            }
            markerManager = new MarkerClusterer(map, marker, mcOptions);
          }
          //apply style to the cluster
          if(settings.clusterer_styles.length != 0){
            markerManager.setStyles(settings.clusterer_styles);
          }
          //settings user position if possible
          if(settings.use_geo == true){
            google.maps.event.addListenerOnce(map, 'idle', function(){
              if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError);
              }else{
                settings.errorGeo({code:0});
              }
            })
          }
        }

        if(doUpdate){
          if(settings.use_spider == true){
            oms = new OverlappingMarkerSpiderfier(map, {markersWontMove: true, markersWontHide: true});
            for(var i = 0; i < totalMarker; i++){
              marker.push(oms.addMarker(createMarker(points.features[i])));
            }
            markerManager = new MarkerClusterer(map, oms.getMarkers(), mcOptions);
            oms.addListener('click', function(marker) {
              setOmsAction(marker);
            });
          }else{
            for(var i = 0; i < totalMarker; i++){
	            marker.push(createMarker(points.features[i]));
            }
            markerManager = new MarkerClusterer(map, marker, mcOptions);
          }
        }else{
          google.maps.event.addListener(markerManager, 'loaded', function(){
            updateMarkerManager();
          });
        }

        //resizing function
        if(settings.resizer != ""){
          $(settings.resizer).click(function(){
            var center = map.getCenter();
            var id = '#'+map.b.id
            $(id).animate({
              height:settings.resizer_height
            }, 500, function(){
              google.maps.event.trigger(map, "resize");
              map.setCenter(center);
            });
            return false;
          });
        }
        if(settings.id != ''){
          attachMapsEventToLinks();
        }
      };

      var onGeoSuccess = function(position){
        var u_position = position.coords;
        homePosition = u_position;
        var pos = new google.maps.LatLng(u_position.latitude, u_position.longitude);
        map.setCenter(pos);
        map.setZoom(10);
        var pos = $.shakeMap.makeGLatLng([u_position.longitude, u_position.latitude]);
        var home = new google.maps.Marker({
          position:pos,
          icon:settings.geo_marker,
          map:map
        });
        marker.push(home);
        markerManager.clearMarkers();
        markerManager = new MarkerClusterer(map, marker, mcOptions);
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'latLng':pos}, function(result, status){
          if(status == google.maps.GeocoderStatus.OK){
            settings.afterGeo(map, u_position, result);
          }
        });
      }

      var onGeoError = function(e){
        settings.errorGeo(e);
      }

      var createMap = function(){
        //create custom styles
        var CUSTOM_MAPTYPE, customStyle, mapOptions, styledMapOptions, customMap;
        
        if(settings.style.length != 0){
          //styled map
          CUSTOM_MAPTYPE = 'custom';
          customStyle = settings.style;
          mapOptions = {
            navigationControlOptions: {style: google.maps.NavigationControlStyle.LARGE},
            mapTypeControl: false,
            mapTypeControlOptions: {mapTypeIds : [google.maps.MapTypeId.ROADMAP, CUSTOM_MAPTYPE]},
            mapTypeId: CUSTOM_MAPTYPE,
            zoom:9,
            scrollwheel: false
          };
          styledMapOptions = {
            name: "custom"
          }
          customMap = new google.maps.StyledMapType(customStyle, styledMapOptions);
          map = new google.maps.Map(map_elm, mapOptions);
          map.mapTypes.set(CUSTOM_MAPTYPE, customMap);
        }else{
          //normal map
          mapOptions = {
            zoomControlOptions: {
              style: google.maps.ZoomControlStyle.DEFAULT
            },
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            maxZoom: 18,
            zoom: 9
          }
          map = new google.maps.Map(map_elm, mapOptions);
        }

        //calculate bounds or single center
        if(totalMarker > 1){
          map.fitBounds(bounds);
        }else{
          map.setCenter(new google.maps.LatLng(points.features[0].geometry.coordinates[1], points.features[0].geometry.coordinates[0]));
          //forze zoom if defined
          if(settings.force_zoom_level){
            map.setZoom(settings.force_zoom_level);
          }
        }

        return map;
      };

      var getBounds = function(doUpdate){
        var newBounds, initialPoint, lenPoints, coords;
        if(totalMarker){
          initialPoint = $.shakeMap.makeGLatLng(points.features[0].geometry.coordinates);
        }else{
          initialPoint = $.shakeMap.makeGLatLng(setting.default_point);
        }

        newBounds = new google.maps.LatLngBounds(initialPoint, initialPoint);
        lenPoints = points.features.length;

        for(var i = 1, len = lenPoints; i < len; i++){
          newBounds.extend($.shakeMap.makeGLatLng(points.features[i].geometry.coordinates));
        }

        return newBounds;
      };

      var addMarkerIcon = function(category){
        if(settings.category_icon.options){
          var category_icon, url, size, origin, anchor, image;
          category_icon = settings.category_icon.options;
          url = category_icon[category];
          size = settings.category_icon.size;
          origin = settings.category_icon.origin;
          anchor = settings.category_icon.anchor;
          
          image = new google.maps.MarkerImage(
            url,
            new google.maps.Size(size[0], size[1]),
            new google.maps.Point(origin[0], origin[1]),
            new google.maps.Point(anchor[0], anchor[1])
          );
          
          return image;
        }else{
          return {};
        }
      };

      var createMarker = function(place_elm){
        var $place_elm = $(place_elm), point, marker, icon_options, mid;
        point = $.shakeMap.makeGLatLng(place_elm.geometry.coordinates);
        mid = settings.id;
        if(settings.category_icon.options){
          category = settings.category_icon.field_name;
          icon_options = addMarkerIcon(place_elm.properties[category]);
          marker = new google.maps.Marker({
            icon:icon_options,
            position:point,
            map:map
          });
        }else{
          marker = new google.maps.Marker({
            position:point,
            map:map
          });
        }
        
        //add url to the marker if its loaded from a JSON
        if(place_elm.properties.path_rendered){
          marker.url = place_elm.properties.path_rendered;
        }
        
        //add information to the marker if its loaded from a JSON
        if(place_elm.properties.description){
          marker.desc = place_elm.properties.description;
        }
        
        if(settings.use_spider == false){
          switch(settings.marker_action){
            //normal infowindow function
            case "infowindow":
              var infowindow = new google.maps.InfoWindow({
                content: marker.desc
              });
              info_windows.push(infowindow);
              google.maps.event.addListener(marker, 'click', function(){
                $.each(info_windows, function(index, iwindow){
                  if(infowindow != iwindow){iwindow.close();}
                });
                infowindow.open(marker.get('map'), marker);
              });
            break;
            
            //infobox overlay function
            case "infobox":
              var infobox = new InfoBox(setInfoboxOption(place_elm.properties.description));
              info_windows.push(infobox);
              google.maps.event.addListener(marker, 'click', function(){
                $.each(info_windows, function(index, iwindow){
                  if(infobox != iwindow){
                    iwindow.close();
                  }
                });
                infobox.open(marker.get('map'), marker);
              });
            break;
            
            //direct click, no infowindow
            case "click":
            google.maps.event.addListener(marker, 'click', function(){
              settings.onClick(this);
            });
            break;
          };
        }
        
        gmarkers[parseInt(place_elm.properties[mid], 10)] = marker;
        return marker;
      };
      
      var attachMapsEventToLinks = function(){
        $('a.open-infowindow').live('click', function(e){
          var marker_index = parseInt($(this).data('marker'), 10);
          google.maps.event.trigger(gmarkers[marker_index], "click");
          map.setCenter(gmarkers[marker_index].position);
          map.setZoom(15);
          
          return false;
        });
      };

      var setOmsAction = function(marker){
        switch(settings.marker_action){
          //normal infowindow function
          case "infowindow":
            infowindow = new google.maps.InfoWindow({
              content:marker.desc
            });
            info_windows.push(infowindow);
            $.each(info_windows, function(index, iwindow){
              if(infowindow != iwindow){
                iwindow.close();
              }
            });
            infowindow.open(map, marker);
          break;
        
          //infobox overlay function
          case "infobox":
            var infobox = new InfoBox(setInfoboxOption(marker.desc));
            info_windows.push(infobox);
            $.each(info_windows, function(index, iwindow){
              if(infobox != iwindow){
                iwindow.close();
              }
            });
            infobox.open(map, marker);
          break;
        
          //direct click, no infowindow
          case "click":
            settings.onClick(marker);
          break;
        }
      }
      
      var setInfoboxOption = function(content){
        var infoOptions, offset;
        offset = settings.infobox_settings.offset;
        infoOptions = {
          content: content,
          disableAutoPan: false,
          maxWidth: 0,
          pixelOffset: new google.maps.Size(offset[0], offset[1]),
          zIndex: null,
          boxStyle:{
            background: "url("+settings.infobox_settings.background+") left top no-repeat",
            opacity: 1,
            width:settings.infobox_settings.width,
            height:settings.infobox_settings.height
          },
          closeBoxMargin: settings.infobox_settings.closeBoxMargin,
          closeBoxURL: settings.infobox_settings.closeBoxURL,
          infoBoxClearance: new google.maps.Size(1, 1),
          isHidden: false,
          pane: "floatPane",
          enableEventPropagation: false
        }
        
        return infoOptions;
      }

      var updateMarkerManager = function(){
        if(settings.always_show_markers == true){
          min_zoom = 0;
        }
        markerManager.addMarkers(marker);
      };

      if($(document).trigger('beforeMapping.shakeMap', [settings]) != false){
        init();
        mapped = true;
      }else{
        mapped = false;
      }

      shakeMapper = {
        gmarkers:gmarkers,
        settings:settings,
        mapped:mapped,
        map:map,
        getBounds:getBounds,
        update: function(args, proxi){
          if ($(document).trigger('beforeUpdate.jMapping', [this])  != false){
            init(true, args, proxi);
            this.map = map;
            this.marker = marker;
            this.markerManager = markerManager;
            $(document).trigger('afterUpdate.shakeMap', [this]);
          }
        }
      };

      $(document).trigger('afterMapping.shakeMap', [shakeMapper]);
      return shakeMapper;
    }else{
      return $(map_elm).data('shakeMap');
    }
  }

  $.extend($.shakeMap, {
    defaults:{
      data:{},
      grid_size:50,
      max_zoom:15,
      clusterer_styles:[],
      default_point:{lat:0.0, lng:0.0},
      id:'',
      category_icon:{
        'field_name':"",
        'options':{},
        'size':[32,32],
        'origin':[0,0],
        'anchor':[0,0]
      },
      use_geo:false,
      geo_marker:"",
      style:{},
      infobox_settings:{"offset":[0,0], "width":"", "height":"", "background":"", "closeBoxMargin":"9px 38px 2px 2px", "closeBoxURL":""},
      marker_action:"infowindow", //infowindow, infobox, click
      resizer: "",
      resizer_height:0,
      use_spider:false,
      onClick:function(marker){},
      afterGeo:function(map, position, result){},
      errorGeo:function(e){}
    },
    makeGLatLng:function(place_point){
      return new google.maps.LatLng(place_point[1], place_point[0]);
    }
  });

  $.fn.shakeMap = function(options, args, proxi){
    if((options == 'update') && $(this[0]).data('shakeMap')){
      $(this[0]).data('shakeMap').update(args, proxi);
    }else{
      if(options == 'update') options = {};
      $(this[0]).data('shakeMap', $.shakeMap(this[0], options));
    }

    return this;
  }
})(jQuery);