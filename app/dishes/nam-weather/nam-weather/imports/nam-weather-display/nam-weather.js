/**
 * Created by Namdascious on 3/19/2015.
 */

(function(){
    var wwo_api_key = '8ecacbd1f61a0ac9190af2d840262';
    var wwo_api_url = 'http://api.worldweatheronline.com/free/v2/weather.ashx';
    var usr_location = {};


    /* Polymer starts right here*/
    Polymer('nam-weather-display', {
        /**
         * Specifies whether the size of the tile on load.
         * sizes: ['half', 'regular', 'double', 'triple', 'quadro']
         *
         * @attribute size
         * @type string
         * @default 'regular'
         */
        size: 'quadro',

        getCityAndState : function(usr_location){
            var city, state;
            var can_break = function(city, state){
                return city !== null && city !== undefined && state !== null && state !== undefined;
            };

            //Get location info
            if(usr_location !== null && usr_location !== undefined){
                for(var i = 0; i < usr_location.length; i++){
                    for(var j = 0; j < usr_location[i].types.length; j++ ){
                        if(usr_location[i].types[j] === 'postal_code'){
                            var addrcomponents = usr_location[i].address_components;

                            for(var k = 0; k < addrcomponents.length; k++){
                                var addr_types = addrcomponents[k].types;

                                for(var l = 0; l < addr_types.length; l++){
                                    //city
                                    if(addr_types[l] === 'locality'){
                                        city = addrcomponents[k].short_name;
                                    }
                                    //state
                                    if(addr_types[l] === 'administrative_area_level_1'){
                                        state = addrcomponents[k].short_name;
                                    }
                                    if(city !== null && city !== undefined && state !== null && state !== undefined){
                                        break;
                                    }
                                }
                                if(can_break(city, state)){ break; }
                            }
                        }
                        if(can_break(city, state)){ break; }
                    }
                    if(can_break(city, state)){ break; }
                }
            }
            return { city: city, state: state };
        },

        getUserLocation: function(lat, long){
            //reverse-geocode for readable info using googlemaps API
            var polymer = this;

            var geocoder = new google.maps.Geocoder();
            var latlng = new google.maps.LatLng(lat, long);
            geocoder.geocode({'latLng': latlng}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var usr_location = results;
                    var weather_cache = localStorage.getItem('weather_data');

                    if(weather_cache !== null && weather_cache !== undefined && weather_cache !== ''){
                        weather_cache = JSON.parse(weather_cache);
                        weather_cache.location = usr_location;
                    }
                    else{
                        weather_cache = { 'weather' : '', 'time' : (new Date().getTime() / 1000).toString(), 'location' : usr_location};
                    }
                    localStorage.setItem('weather_data', JSON.stringify(weather_cache));
                    polymer.updateWeather(weather_cache);
                } else {
                    //alert('Geocoder failed due to: ' + status);
                    //Handle eror using dish/dish-tray specific means
                }
            });
        },

        getWeather: function(position){
            if(Modernizr.localstorage /* Probably uneccessary */){
                var weather_data = localStorage.getItem('weather_data');

                if(weather_data !== null && weather_data !== undefined && weather_data !== ''){
                    var weather_data_obj = JSON.parse(weather_data);
                    var time = new Date().getTime() / 1000;
                    var cache_time = parseFloat(weather_data_obj.time);
                    if(time - cache_time < 20000){ //refreshes cache every 20 mins. Weather doesn't change that much
                        return weather_data_obj;
                    }
                }
            }
            return null; //no data in cache or cache expired
        },

        getWeatherFromService: function(position){
            var polymer = this;
            var lat =  position.coords.latitude;
            var long = position.coords.longitude;

            //Get the user's city & state at the same time
            polymer.getUserLocation(position.coords.latitude, position.coords.longitude);

            var weather_url = wwo_api_url + '?key=' + wwo_api_key + '&q=' + lat.toString() + ',' + long.toString() + '&format=JSON';
            var http  = new XMLHttpRequest();
            http.open("GET", weather_url);
            http.onload = function(){ polymer.receiveWeather(http); }
            http.send();
        },

        /**
         * rearranges dish tile layout based on window resize
         */
        rearrangeElements: function(){
        },

        ready: function(){
            var polymer = this; /* instance of polymer */
            window.resizeStop.bind(polymer.rearrangeElements);
            polymer.startWeatherProcess();
            //this.updateWeather(null); //testing...
        },

        receiveWeather: function(http){
            var polymer = this;
            if(http.readyState == 4 && http.status == 200){
                //var weather_info = JSON.parse(http.responseText);
                var weather_info = JSON.parse(http.responseText);

                //cache in localstorage
                var weather_cache = localStorage.getItem('weather_data');

                if(weather_cache !== null && weather_cache !== undefined && weather_cache !== ''){
                    weather_cache = JSON.parse(weather_cache);
                    weather_cache.weather = weather_info;
                    weather_cache.time = (new Date().getTime() / 1000).toString();
                }
                else{
                    weather_cache = { 'weather': weather_info, 'time' : (new Date().getTime() / 1000).toString(), 'location': ''};
                }

                localStorage.setItem('weather_data', JSON.stringify(weather_cache));
                polymer.updateWeather(weather_cache);
            }
        },

        startWeatherProcess: function(){
            var polymer = this;
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(function(position){
                    var data = polymer.getWeather(position);
                    if(data !== null){
                        //render weather info with Polymer
                        //polymer.getUserLocation(position.coords.latitude, position.coords.longitude);
                        polymer.updateWeather(data);
                    }
                    else {
                        polymer.getWeatherFromService(position);
                    }
                });
            }
            else { /*alert("I wasn't able to get your location. Sorry...");*/}
        },

        /**
         * Display weather info passed in
         */
        updateWeather: function(data){
            /**
             * Using World Weather Online API.
             *
             */
            var polymer = this;
            if(data === null){
                return;
            }
            var weather = data.weather;
            var cityAndState = polymer.getCityAndState(data.location);

            //Get weather information
            if(weather !== null && weather !== undefined){}

            //Get icons
            $.get('imports/nam-weather-display/wwo_weather_codes.json', function(data){
                var icon_obj = _.find(data, function(icon_elem){
                    return weather.data.current_condition[0].weatherCode == icon_elem.WeatherCode;
                });

                polymer.temperature = { F: weather.data.current_condition[0].temp_F, C: weather.data.current_condition[0].temp_C };
                polymer.currTime = new Date().getTime();
                polymer.unit = 'F'; //default
                polymer.city = cityAndState.city;
                polymer.state = cityAndState.state;
                polymer.icon_single = '';
                polymer.forecast = [
                    {
                        weather: ''
                    }
                ];

                if(icon_obj !== null && icon_obj !== undefined){
                    polymer.icon_single = icon_obj.DayIcon;
                }
            });
        }
    });

    /*function startWeatherProcess(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(function(position){
                var data = getWeather(position);
                if(data !== null){
                    //render weather info with Polymer
                    getUserLocation(position.coords.latitude, position.coords.longitude);
                    Polymer.updateWeather(data);
                }
                else {
                    getWeatherFromService(position);
                }
            });
        }
        else {}
    }*/

    /*function getUserLocation(lat, long){
        //reverse-geocode for readable info using googlemaps API
        var http = new XMLHttpRequest();
        http.open("GET", google_maps_url + lat.toString() + ',' + long.toString() + '&sensor=true');
        http.onload = function(){ receiveLocation(http); }
        http.send();
    }*/

    /*function getWeather(position){
        if(Modernizr.localstorage){
            var weather_data = localStorage.getItem('weather_data');

            if(weather_data !== null && weather_data !== undefined){
                var time = new Date().getTime() / 1000;
                if(time - weather_data.time < 20000){
                    return weather_data.data;
                }
            }
        }
        return null;
    }*/

    /*function getWeatherFromService(position){
        var lat =  position.coords.latitude;
        var long = position.coords.longitude;

        var weather_url = wwo_api_url + '?key=' + wwo_api_key + '&q=' + lat.toString() + ',' + long.toString() + '&format=JSON';
        var http  = new XMLHttpRequest();
        http.open("GET", weather_url);
        http.onload = function(){ receiveWeather(http); }
        http.send();
    }

    function receiveLocation(http){
        if(http.readyState == 4 && http.status == 200){
            var usr_location = JSON.parse(http.responseText);

            var weather_cache = localStorage.getItem('weather_data');

            if(weather_cache !== null && weather_cache !== undefined){
                weather_cache.location = usr_location;
            }
            else{
                weather_cache = { weather: null, time : (new Date().getTime() / 1000), location: usr_location};
            }
            localStorage.setItem('weather_data', weather_cache);
            Polymer.updateWeather(weather_cache);
        }
    }

    function receiveWeather(http){
        if(http.readyState == 4 && http.status == 200){
            var weather_info = JSON.parse(http.responseText);

            //cache in localstorage
            var weather_cache = localStorage.getItem('weather_data');

            if(weather_cache !== null && weather_cache !== undefined){
                weather_cache.weather = weather_info;
                weather_cache.time = new Date().getTime() / 1000;
            }
            else{
                weather_cache = { weather: weather_info, time : (new Date().getTime() / 1000), location: null};
            }

            localStorage.setItem('weather_data', weather_cache);
            var test = window;
            Polymer.updateWeather(weather_info);
        }
    }*/

})();
