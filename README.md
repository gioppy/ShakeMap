ShakeMap
========

ShakeMap jQuery plugin

This is a jQuery plugin for managing Google Maps from a GeoJSON file.
The base plugin is a modified version of the original plugin jMapping, created by Brian Landau (Viget Labs - http://vigetlabs.github.com/jmapping/).
In this fork, I have changed the way the data is selected and manipulated. All the infomation about a location is retrived using AJAX and manipulated in real time by the plugin.

The plugin requires:

- MarkerClucterer - http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/docs/reference.html

Optional requirement:

- OverlappingMarkerSpiderfier - https://github.com/jawj/OverlappingMarkerSpiderfier
- Infobox - http://code.google.com/p/gmaps-samples-v3/source/browse/trunk/infowindow_custom/?r=37

Examples
========

Using the plugin is very simple! Call the JSON via AJAX and call the shakeMap function:

    jQuery(function(){  
      jQuery.getJSON('out.json', function(data, success){  
        if(success){  
          jQuery('#map').shakeMap({  
            data:data  
          });  
        }  
      });  
    })

The div#map has the simple style of width and heigh!

Plugin Options
========

data:{}, //the data information of the location  
grid_size:50, //the grid size of the markerclucterer  
max_zoom:15, //the maximun zoom for the markerclucterer  
clusterer_styles:[], //the style of the markerclucterer  
default_point:{lat:0.0, lng:0.0}, //default latitude and longitude fallback  
use_geo:false, //using HTML5 geolocation  
styled:false, //simple check if use or not the styled map  
styled_obj:{}, //styled map object 
infobox_settings:{"offset":[0,0], "width":"", "height":"", "background":"", "closeBoxMargin":"9px 38px 2px 2px", "closeBoxURL":""}, //infobox setting object  
marker_action:"infowindow", //action to the marker: infowindow, infobox, click  
use_spider:false //add OverlappingMarkerSpiderfier to the marker  
onClick:function(marker){} //on click event when marker_action is set to "click"