/*
 * Copyright 2003-2006, 2009, 2017, 2020 United States Government, as represented
 * by the Administrator of the National Aeronautics and Space Administration.
 * All rights reserved.
 *
 * The NASAWorldWind/WebWorldWind platform is licensed under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License
 * at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 *
 * NASAWorldWind/WebWorldWind also contains the following 3rd party Open Source
 * software:
 *
 *    ES6-Promise – under MIT License
 *    libtess.js – SGI Free Software License B
 *    Proj4 – under MIT License
 *    JSZip – under MIT License
 *
 * A complete listing of 3rd Party software notices and licenses included in
 * WebWorldWind can be found in the WebWorldWind 3rd-party notices and licenses
 * PDF found in code  directory.
 */
/**
 * Illustrates how to load and display a Collada 3D model onto the globe. Also shows how to calculate
 * intersection points when you click on the model.
 */
var trashData = '';
var trashScene = null;
var spacetrashLayer = null;
var trashDt =new Array();

requirejs(['./WorldWindShim',
        './LayerManager'],
    function (WorldWind, LayerManager) {
        "use strict";

        // Tell WorldWind to log only warnings and errors.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        function getTrashPos(line1, line2, time){
// Initialize a satellite record
            var satrec = satellite.twoline2satrec(line1, line2);

//  Or you can use a JavaScript Date
            var positionAndVelocity = satellite.propagate(satrec, time);

// The position_velocity result is a key-value pair of ECI coordinates.
// These are the base results from which all other coordinates are derived.
            var positionEci = positionAndVelocity.position;
            var velocityEci = positionAndVelocity.velocity;

// You will need GMST for some of the coordinate transforms.
// http://en.wikipedia.org/wiki/Sidereal_time#Definition
//get
            var gmst = satellite.gstimeFromDate(time);

            var positionGd = null;
            try {
                positionGd = satellite.eciToGeodetic(positionEci, gmst);
            }catch(err){
                alert("error on:"+line1+"\n"+line2);
            }

// Geodetic coords are accessed via `longitude`, `latitude`, `height`.

            var position= {};
            position.gd = {};
            position.gd.longitude = satellite.degreesLong(positionGd.longitude);
            position.gd.latitude  = satellite.degreesLat(positionGd.latitude);
            position.gd.height    = positionGd.height*1000;
            position.eci = positionEci;

            return position;
        }


        function getTrash(){
            var request = new XMLHttpRequest();
            request.open('GET', './trash-data/space-track-full-3le.txt', true);
            request.send(null);
            request.onreadystatechange = function () {
                if (request.readyState === 4 && request.status === 200) {
                    var type = request.getResponseHeader('Content-Type');
                    if (type.indexOf("text") !== 1) {
                        trashData = request.responseText;
                        var lines3le = trashData.match(/[^\r\n]+/g);
                        var trashName = '';
                        var line1 = '';
                        var line2 = '';
                        for (var i = 0; i < lines3le.length; i++) {
                            if (i % 3 == 0) {
                                trashName = lines3le[i];
                            } else if (i % 3 == 1) {
                                line1 = lines3le[i];
                            }
                            if (i % 3 == 2) {
                                line2 = lines3le[i];
                                if (line1 != '' && line2 != '') {

                                    var trashObj = {};
                                    trashObj.line1 = line1;
                                    trashObj.line2 = line2;
                                    trashObj.name = trashName;
                                    trashObj.id = ""+trashDt.length;
                                    trashDt.push(trashObj);
                                }
                            }
                        }
                        var time = new Date();
                        for (var i = 0; i < trashDt.length; i++) {

                            var trashPos = getTrashPos(trashDt[i].line1, trashDt[i].line2, time);
                            var position = new WorldWind.Position(trashPos.gd.latitude, trashPos.gd.longitude, trashPos.gd.height);
                            var trashObject = new WorldWind.GeographicText(position,trashDt[i].id );

                            spacetrashLayer.addRenderable(trashObject);

                        }
                    }

                }
            }
        }


        // Create the WorldWindow.
        var wwd = new WorldWind.WorldWindow("canvasOne");

        wwd.navigator.lookAtLocation.latitude = 44.439663 ;
        wwd.navigator.lookAtLocation.longitude = 26.096306;

        // Create and add layers to the WorldWindow.
        var layers = [
            // Imagery layers.
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: false},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            // Add atmosphere layer on top of all base layers.
            {layer: new WorldWind.AtmosphereLayer(), enabled: true},
            // WorldWindow UI layers.
            {layer: new WorldWind.CompassLayer(), enabled: true},
            {layer: new WorldWind.CoordinatesDisplayLayer(wwd), enabled: true},
            {layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }

        // Create renderable layer to hold the Collada model.
        spacetrashLayer = new WorldWind.RenderableLayer("spacetrash");
        wwd.addLayer(spacetrashLayer);
        var placemarkLayer = new WorldWind.RenderableLayer("Placemarks")
        wwd.addLayer(placemarkLayer);

        // Define a position for locating the model.
        var position = new WorldWind.Position( 44.439663, 26.096306, 1000e3);

        // Create a Collada loader and direct it to the desired directory and .dae file.
        var colladaLoader = new WorldWind.ColladaLoader(position);
        colladaLoader.init({dirPath: './collada_models/'});

        colladaLoader.load('cube4.dae', function (scene) {
            scene.scale = 25000;
            spacetrashLayer.addRenderable(scene); // Add the Collada model to the renderable layer within a callback.
            trashScene = scene;
        });

        getTrash();

        // The following is an example of 3D ray intersaction with a COLLADA model.
        // A ray will be generated extending from the camera "eye" point towards a point in the
        // COLLADA model where the user has clicked, then the intersections between this ray and the model
        // will be computed and displayed.

        // Add placemarks to visualize intersection points.
        var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageColor = WorldWind.Color.RED;
        placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
        placemarkAttributes.drawLeaderLine = true;
        placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;
        placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/crosshair.png";

        // The next placemark will portray the closest intersection point to the camera, marked in a different color.
        var closestPlacemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        closestPlacemarkAttributes.imageColor = WorldWind.Color.GREEN;
        closestPlacemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.GREEN;

        // Add click event to trigger the generation of the ray and the computation of its intersections with the COLLADA model.
        var handleClick = function (o) {
            if (trashScene == null) {
                return;
            }
            placemarkLayer.removeAllRenderables();

            // Obtain 3D ray that extends from the camera "eye" point towards the point where the user clicked on the COLLADA model.
            var clickPoint = wwd.canvasCoordinates(o.clientX, o.clientY);
            var clickRay = wwd.rayThroughScreenPoint(clickPoint);

            // Compute intersection points between the model and the ray extending from the camera "eye" point.
            // Note that this takes into account possible concavities in the model.
            var intersections = [];
            if (trashScene.computePointIntersections(wwd.globe, clickRay, intersections)) {
                for (var i = 0, len = intersections.length; i < len; i++) {
                    var placemark = new WorldWind.Placemark(intersections[i], true, null);
                    placemark.altitudeMode = WorldWind.ABSOLUTE;
                    if (i == 0) {
                        placemark.attributes = closestPlacemarkAttributes;
                    } else {
                        placemark.attributes = placemarkAttributes;
                    }
                    placemarkLayer.addRenderable(placemark);
                }
            }

            // Redraw scene with the computed results.
            wwd.redraw();
        };

        // Listen for mouse clicks to trigger the related event.
        wwd.addEventListener("click", handleClick);



        var sunSimulationCheckBox = document.getElementById('stars-simulation');
        var doRunSimulation = false;
        var timeStamp = Date.now();
        var factor = 1;

        sunSimulationCheckBox.addEventListener('change', onAnimateBoxClick, false);

        function onAnimateBoxClick() {
            doRunSimulation = this.checked;
            if (!doRunSimulation) {
            }
            wwd.redraw();
        }

        function runSunSimulation(wwd, stage) {
            if (stage === WorldWind.AFTER_REDRAW && doRunSimulation) {
                var time = new Date();
                for(var i=0;i<spacetrashLayer.renderables.length;i++){
                    try {
                        var trashPos = getTrashPos(trashDt[i].line1, trashDt[i].line2, time);
                        var position = new WorldWind.Position(trashPos.gd.latitude, trashPos.gd.longitude, trashPos.gd.height * 1000);
                        spacetrashLayer.renderables[i].position = position;
                    }catch(err){

                    }
                }
                wwd.redraw();
            }
        }

        wwd.redraw();
        wwd.redrawCallbacks.push(runSunSimulation);

        // Create a layer manager for controlling layer visibility.
        var layerManager = new LayerManager(wwd);
    });