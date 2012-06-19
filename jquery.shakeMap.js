/*
 * ShakeMap v0.0.4 - jQuery plugin for creating Google Maps, based on jMapping plugin created by Brian Landau (Viget Labs)
 *
 * Copyright (c) 2011 Giovanni Buffa
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 */

(function($){
  $.shakeMap = function(map_elm, options){
    var settings, gmarkers, marker, mapped, map, markerManager, places, bounds, boundsJ, shakeMapper, info_windows, points, totalMarker, mcOptions;
    map_elm = (typeof map_elm == "string") ? $(map_elm).get(0) : map_elm;

    if(!($(map_elm).data('shakeMap'))){
      settings = $.extend(true, {}, $.shakeMap.defaults);
      $.extend(true, settings, options);

      mcOptions = {gridSize:settings.grid_size, maxZoom: settings.max_zoom, styles:settings.cluster_styles};

      var init = function(doUpdate, data){
        var min_zoom, zoom_level;
        marker = [];
	    info_windows = [];
        if(doUpdate){
          points = data;
        }else{
          points = settings.data;
        }
	    totalMarker = points.points.length;
        bounds = getBounds(doUpdate);
        for(var i = 0; i < totalMarker; i++){
          marker.push(createMarker(points.points[i]));
          $(document).trigger('markerCreated.shakeMap', [marker]);
        }

        //update
        if(doUpdate){
          markerManager.clearMarkers();
          google.maps.event.trigger(map, 'resize');
          map.fitBounds(bounds);
        }else{
          //create new map
          map = createMap();
          markerManager = new MarkerClusterer(map, marker, mcOptions);
          if(settings.clusterer_styles.length != 0){
            var styles = settings.clusterer_styles;
            markerManager.setStyles(styles);
          }
          if(settings.use_geo == true){
            navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError);
          }
        }

        if(doUpdate){
          //updateMarkerManager();
          markerManager = new MarkerClusterer(map, marker, mcOptions);
        }else{
          google.maps.event.addListener(markerManager, 'loaded', function(){
            updateMarkerManager();
          });
        }
      };

      var onGeoSuccess = function(position){
        var u_position = position.coords;
        map.setCenter(new google.maps.LatLng(u_position.latitude, u_position.longitude));
        map.setZoom(10);
        var pos = $.shakeMap.makeGLatLng({"lat":u_position.latitude ,"lng":u_position.longitude});
        var home = new google.maps.Marker({
          position:pos,
          icon:"home.png",
          map:map
        });
        marker.push(home);
        markerManager.clearMarkers();
        markerManager = new MarkerClusterer(map, marker, mcOptions);
      }

      var onGeoError = function(e){
        console.log(e);
      }

      var createMap = function(){
        //create custom styles
        var CUSTOM_MAPTYPE, customStyle, mapOptions, styledMapOptions, customMap;
        
        if(settings.style != false){
          //styled map
          CUSTOM_MAPTYPE = 'custom';
          if(settings.styles){
            customStyle = settings.styles;
          }
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
          map.setCenter(new google.maps.LatLng(points.points[0].point.lat, points.points[0].point.lng));
          //forze zoom if defined
          if(settings.force_zoom_level){
            map.setZoom(settings.force_zoom_level);
          }
        }

        return map;
      };

      var getBounds = function(doUpdate){
        var newBounds, initialPoint;
        if(totalMarker){
          initialPoint = $.shakeMap.makeGLatLng(points.points[0].point);
        }else{
          //initialPoint = $.shakeMap.makeGLatLng(setting.default_point);
        }

        newBounds = new google.maps.LatLngBounds(initialPoint, initialPoint);

        for(var i = 1, len = points.points.length; i < len; i++){
          newBounds.extend($.shakeMap.makeGLatLng(points.points[i].point));
        }

        return newBounds;
      };

      var chooseIconOptions = function(category){
        if(settings.category_icon_options){
          var category_icon_options = settings.category_icon_options;
          return category_icon_options[category] || category_icon_options['default'];
        }else{
          return {};
        }
      };

      var createMarker = function(place_elm){
        var $place_elm = $(place_elm), place_data, point, lat, lng, latLng, marker, $info_window_elm, info_window, icon_options;

        point = $.shakeMap.makeGLatLng(place_elm.point);
        if(settings.category_icon_options){
          icon_options = chooseIconOptions(place_elm.point.categoria);
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

        if(totalMarker > 0){
          //apply infobox if is defined
          if(settings.infobox != false){
            if(settings.show_baloon == true){
              var offset, regExp, size, infoOptions, infobox;
              //apply offset to infobox
              offset = settings.infobox_settings.offset;
              regExp = /^.\[\s*([0-9]*\s*,\s*[0-9]*)\s*\].*$/;
              size = offset.replace(regExp, '$1').split(',');
              
              infoOptions = {
                content:$('<div/>').html(place_elm.point.informazioni).text(),
                disableAutoPan: false,
                maxWidth: 0,
                pixelOffset: new google.maps.Size(parseInt(size[0].replace(/ /g, '')), parseInt(size[1].replace(/ /g, ''))),
                zIndex: null,
                boxStyle:{
                  background: "url("+settings.infobox_settings.background+") left top no-repeat",
                  opacity: 1,
                  width: "231px",
                  height:"175px"
                },
                closeBoxMargin: settings.infobox_settings.closeBoxMargin,
                closeBoxURL: settings.infobox_settings.closeBoxURL,
                infoBoxClearance: new google.maps.Size(1, 1),
                isHidden: false,
                pane: "floatPane",
                enableEventPropagation: false
              }
              infobox = new InfoBox(infoOptions);
              info_windows.push(infobox);
              //TODO: add support to disable click event
              google.maps.event.addListener(marker, 'click', function(){
                $.each(info_windows, function(index, iwindow){
                  if(infobox != iwindow){
                    iwindow.close();
                  }
                });
                infobox.open(map, marker);
              });
            }
          }else{
            //Normal iwindow
            if(settings.show_baloon == true){
              info_window = new google.maps.InfoWindow({
                content: $('<div/>').html(place_elm.point.informazioni).text()
                //maxWidth: settings.info_window_max_width
              });
              info_windows.push(info_window);
              //TODO: add support to disable click event
              google.maps.event.addListener(marker, 'click', function(){
                $.each(info_windows, function(index, iwindow){
                  if(info_window != iwindow){
                    iwindow.close();
                  }
                });
                info_window.open(map, marker);
              });
            }
          }
        }
        return marker;
      };

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
        update: function(args){
          if ($(document).trigger('beforeUpdate.jMapping', [this])  != false){
            init(true, args);
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
      use_geo:false,
      styled:false,
      styled_obj:{},
      infobox:false,
      infobox_settings:{"offset":"", "background":"", "closeBoxMargin":"9px 38px 2px 2px", "closeBoxURL":""},
      show_baloon:true,
      marker_action:"click"
    },
    makeGLatLng:function(place_point){
      return new google.maps.LatLng(place_point.lat, place_point.lng);
    }
  });

  $.fn.shakeMap = function(options, args){
    if((options == 'update') && $(this[0]).data('shakeMap')){
      $(this[0]).data('shakeMap').update(args);
    }else{
      if(options == 'update') options = {};
      $(this[0]).data('shakeMap', $.shakeMap(this[0], options));
    }

    return this;
  }
})(jQuery);