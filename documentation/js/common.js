jQuery(function(){
  var mapStyle = [{"featureType":"road.local","stylers":[{"color":"#ffffff"}]},{"featureType":"water","stylers":[{"color":"#3fc6f3"}]},{"featureType":"landscape","stylers":[{"color":"#46d7c6"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#ffffff"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#b1d8d3"}]},{"featureType":"road.arterial","stylers":[{"color":"#d8e0e9"}]}];
  var icons = {
    field_name:"icon",
    options:{
      'skmap':'images/icon.png'
    },
    size:[64,64],
    origin:[0,0],
    anchor:[32,64]
  };
  
  jQuery('#go-down').click(function(){
    var ancor = jQuery(this).attr('href');
    jQuery.scrollTo(jQuery(ancor), 800, {
      onAfter:function(){
        window.location.hash = ancor;
      }
    });
    return false;
  })
  
  jQuery('#slides').cycle({
    timeout:0,
    fx:'scrollHorz',
    slides:'> article',
    next:'#next',
    prev:'#prev'
  })
  
  jQuery('#single-map').shakemap({
    data:'json/simple.json'
  })
  
  jQuery('#demo-content footer a').click(function(){
    jQuery('#single-map').shakemap('destroy');
    var $this = jQuery(this);
    var title = $this.text();
    var $data = $this.data('json');
    jQuery('#demo-content footer li').removeClass('active');
    $this.parent().addClass('active');
    
    jQuery('#demo span.token').text(title);
    
    if(jQuery('#map-1')[0].childElementCount > 0){
      jQuery('#single-map').show();
      jQuery('#map-1, #map-2').hide();
      jQuery('#map-1, #map-2').shakemap('destroy');
    }
    
    if(jQuery('#map-with-sidebar')[0].childElementCount > 0){
      jQuery('#single-map').show();
      jQuery('#map-with-sidebar').shakemap('destroy');
      jQuery('#sidebar').empty();
      jQuery('#map-with-sidebar, #sidebar').hide();
    }
    
    switch($data){
      case 'simple':
        jQuery('#single-map').shakemap({
          data:'json/simple.json'
        })
      break;
      
      case 'clustering':
        jQuery('#single-map').shakemap({
          data:'json/clustering.json',
          clusterer:{
            max_zoom:18
          }
        })
      break;
      
      case 'spider':
        jQuery('#single-map').shakemap({
          data:'json/spider.json',
          spider:true
        })
      break;
      
      case 'infobox':
        jQuery('#single-map').shakemap({
          data:'json/simple.json',
          action:'infobox',
          infoboxSettings:{
            offset:[-225,-100],
            width:"215px",
            height:"166px",
            background:"images/infobox_bg.png",
            closeBoxMargin:"5px 25px 0 0",
            closeBoxURL:"images/infobox_close_bg.png"
          },
        })
      break;
      
      case 'multiple':
        var mapOptions = {
          scaleControl:false,
          panControl:false,
          draggable:false,
          mapTypeControl:false,
          backgroundColor:"#1FBBA6"
        }
        jQuery('#single-map').hide();
        jQuery('#map-1, #map-2').show();
        jQuery('#map-1').shakemap({
          data:'json/map1.json',
          mapOptions:mapOptions
        });
        jQuery('#map-2').shakemap({
          data:'json/map2.json',
          mapOptions:mapOptions
        });
      break;
      
      case 'sidebar':
        jQuery('#single-map').hide();
        jQuery('#map-with-sidebar, #sidebar').show();
        jQuery.getJSON('json/sidebar.json', function(data){
          jQuery('#map-with-sidebar').shakemap({
            data:data,
            sidebar:{
              active:true,
              mid:null,
              target:"#sidebar"
            }
          });
          for(var i = 0; i < data.features.length; i++){
            jQuery('#sidebar').append(data.features[i].properties.description);
          }
        });
      break;
      
      case 'external':
        jQuery('#single-map').hide();
        jQuery('#map-with-sidebar, #sidebar').show();
        jQuery.getJSON('json/external.json', function(data){
          jQuery('#map-with-sidebar').shakemap({
            data:data,
            sidebar:{
              active:true,
              mid:'nid',
              target:"#sidebar"
            }
          });
          for(var i = 0; i < data.features.length; i++){
            jQuery('#sidebar').append(data.features[i].properties.description);
          }
        });
      break;
      
      case 'icons':
        jQuery('#single-map').shakemap({
          data:'json/simple.json',
          categoryIcons:icons,
        })
      break;
      
      case 'geolocation':
        jQuery('#single-map').shakemap({
          data:'json/simple.json',
          categoryIcons:icons,
          clusterer:{
            max_zoom:1
          },
          geolocation:{
            active:true,
            marker:"images/user.png",
            onGeolocation:function(map, position, result){
              alert("Your position is: latitude "+position.latitude+", longitude "+position.longitude);
            },
            onError:function(error){
              alert("ERROR: "+error.errorCode);
            }
          },
        })
      break;
      
      case 'style':
        jQuery('#single-map').shakemap({
          data:'json/simple.json',
          categoryIcons:icons,
          mapStyle:mapStyle
        })
      break;
    }
    
    return false;
  })
})