/**
 * Author: Gabriel Ratschiller
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var flightListMonth = [];
var airportList = [];

var selectedCountries = {};
//var selectedCountriesWithinEdges = {};
//var selectedCountriesOutgoingEdges = {};
//var selectedCountriesIncomingEdges = {};

var svgMap;
var svgRect;
var projection;

var amountEdges;

var withinEdges = false;
var betweenEdges = false;
var backgroundEdges = false;

var drawSelectionsMode = false;
var startSelection = true;
var selectionRect;
var mouseCoords;

var selections = [];
var selectionCoords = [];

var selectionCoordsStart = [];
var selectionCoordsEnd = [];

var selectedSelections = [false,false,false,false,false,false,false,false,false,false];
var selectionsWithinEdges = [0,0,0,0,0,0,0,0,0,0];
var selectionsOutgoingEdges = [0,0,0,0,0,0,0,0,0,0];
var selectionsIncomingEdges = [0,0,0,0,0,0,0,0,0,0];

var selectionsColors = [
    "#d33135",
    "#4986b2",
    "#5aab56",
    "#e88628",
    "#964f9d",
    "#22e0e0",
    "#ffd500",
    "#b4e931",
    "#d60e92",
    "#671d00"]

var maxSelection = 10;
var selectionsCount = 0;

/**
 * At startup of the program, initializes the map, views and data
 */
function init() {
    initFilters();
    loadData(1901);
    loadWorldMap();
    initMapZoom();
}

/**
 * Initializes the filter checkboxes and inputs
 */
function initFilters() {
    d3.select("#withinEdges").on("change", updatedEdgeFilters);
    d3.select("#betweenEdges").on("change", updatedEdgeFilters);
    d3.select("#backgroundEdges").on("change", updatedEdgeFilters);
    d3.select("#drawselections").on("change", updatedSelectionMode);
}

/**
 * If an edge filter has been changed the map has to be updated
 */
function updatedEdgeFilters() {
    withinEdges = d3.select("#withinEdges").property("checked");
    betweenEdges = d3.select("#betweenEdges").property("checked");
    backgroundEdges = d3.select("#backgroundEdges").property("checked");
    displayData();
    //redrawEdgesAndUpdateInfo();
}

/**
 * If the selection mode has been changed
 */
function updatedSelectionMode(){
    drawSelectionsMode = d3.select("#drawselections").property("checked");
}

function loadDataForMonth(month) {
    // TODO check for correct month input
    loadData(month);
}

/**
 * Loads the european map from the topojson file
 */
function loadWorldMap() {
    var countries;

    //Load the world map from topojson
    d3.json('./dataset/europe_map_ICAO.json').then(function (worldData) {
        if (worldData)
            countries = topojson.feature(worldData, worldData.objects.europe).features;

        var margin = {top: 50, left: 50, right: 50, bottom: 50},
            height = 600 - margin.top - margin.bottom,
            width = 900 - margin.left - margin.right;

        svgMap = d3.select("#map")
            .append('svg')
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + (2 * margin.left) + "," + margin.top + ")");

        projection = d3.geoMercator()
            .translate([width / 3, height * 1.7])
            .scale(500)

        var geoPath = d3.geoPath()
            .projection(projection)

        svgMap.append('g').selectAll('path')
            .data(countries)
            .join('path')
            .attr("name", function (d) {
                return d.properties.NAME;
            })
            .attr("namesum", function (d) {
                return d.properties.NAMESUM;
            })
            .attr("ICAO", function (d) {
                //selectedCountries[d.properties.ICAO] = false;
                //selectedCountriesWithinEdges[d.properties.ICAO] = 0;
                //selectedCountriesOutgoingEdges[d.properties.ICAO] = 0;
                //selectedCountriesIncomingEdges[d.properties.ICAO] = 0;
                return d.properties.ICAO;
            })
            .attr('d', geoPath)
            .attr('fill', '#000000')
            .attr('stroke', '#FFFFFF')
            .on("mouseover", function (event) {
                if (d3.select(this).attr("fill") !== "#83d0c9" && !drawSelectionsMode) {
                    d3.select(this).attr("fill", "#35a79c")
                    d3.select(this).attr("stroke", "#35a79c")
                }
                d3.select("#countryname")
                    .text(d3.select(this).attr("name"));

            })
            .on("mouseout", function (event) {
                if (d3.select(this).attr("fill") !== "#83d0c9" && !drawSelectionsMode) {
                    d3.select(this).attr("fill", "#000000")
                    d3.select(this).attr("stroke", "#FFFFFF")
                }
            })
            //.on("mousedown", mousedown)
            //.on("mouseup", mouseup);

            /*.call(function(event) {
                    d3.drag()
                        .on("start", mousedown)
                        //.on("drag", mousemove)
                        .on("end", mouseup)
            });*/
            .on("mousemove", mousemove)
            .on("click", selectedCountry);

        loadAirports();
    });
}

/**
 * Loads the european airports and draws them as circles
 */
function loadAirports() {
    d3.csv('./dataset/airports.csv', function (airportData) {
        if (airportData)
            this.airportList.push(airportData);
    }).then(function () {
        svgMap.append('g').selectAll('circles')
            .data(airportList)
            .enter().append("circle")
            .attr("r", 0.3)
            .attr("cx", function (d) {
                var coords = projection([d.longitude, d.latitude])
                return coords[0];
            })
            .attr("cy", function (d) {
                var coords = projection([d.longitude, d.latitude])
                return coords[1];
            })
            .attr('fill', '#ff5703')
            .attr("pointer-events", "none");
    });
}

/**
 * Triggers if a selection has been made in the draw selection mode
 * @param event
 */
function mousemove(event) {
    if (!drawSelectionsMode || startSelection)
        return;

    mouseCoords = d3.pointer(event);
    selectionRect.attr("width", Math.max(0, mouseCoords[0] - 0.5 - +selectionRect.attr("x")))
        .attr("height", Math.max(0, mouseCoords[1] - 0.5 - +selectionRect.attr("y")))
        //.attr("stroke", "#b30000")
        .attr("stroke", selectionsColors[selectionsCount])
        .attr("stroke-width", 0.75)
        .attr("fill", "none")
        .attr("pointer-events", "none");
}

/**
 * Sets the color of a country if it has been clicked and adds or removes the corresponding high level information
 */
function selectedCountry(event) {
    if (drawSelectionsMode) {
        drawSelection(event);
    }

    /*if (d3.select(this).attr("fill") === "#83d0c9") {
        d3.select(this).attr("fill", "#35a79c")
        selectedCountries[d3.select(this).attr("ICAO")] = false;

        displayData(false, d3.select(this));
    } else {
        d3.select(this).attr("fill", "#83d0c9")
        d3.select(this).attr("stroke", "#FFFFFF")
        selectedCountries[d3.select(this).attr("ICAO")] = true;

        displayData(true, d3.select(this));
    }*/
}

/**
 * Responsible for the selectionas drawing process
 * @param event
 */
function drawSelection(event) {
    if (selectionsCount >= maxSelection)
        return;

    mouseCoords = d3.pointer(event);

    if (startSelection) {
        selectionRect = svgMap.append("rect")
            .attr("x", mouseCoords[0])
            .attr("y", mouseCoords[1])
            .attr("height", 0)
            .attr("width", 0);

        selectionCoordsStart = projection.invert([mouseCoords[0], mouseCoords[1]]);
        startSelection = false;
    } else {
        selectionsCount++;
        selectionRect
            .attr("id", "selection" + selectionsCount + "R")                                // TODO wenn man löscht und neu zeichnet, ist index falsch
            .attr("width", Math.max(0, mouseCoords[0] - +selectionRect.attr("x")))
            .attr("height", Math.max(0, mouseCoords[1] - +selectionRect.attr("y")));

        d3.select("#selections")
            .append("p")
            .attr("id", "selection" + selectionsCount + "P")
            .text("Selection " + selectionsCount)
            .append("input")
            .attr("type", "button")
            .attr("class", "button")
            .attr("id", "selection" + selectionsCount)
            .attr("value", "Delete Selection")
            .on("click", function () {
                var id = d3.select(this).attr("id");
                d3.select("#" + id + "P").remove();
                d3.select("#" + id + "R").remove();
                selectedSelections[id.substring(id.length-1,id.length)-1] = false;
                console.log(selectedSelections);
                //selectionsCount--;
                displayData(false, id.substring(id.length-1,id.length)-1);
            });

        selectionCoordsEnd = projection.invert([mouseCoords[0], mouseCoords[1]]);
        selectionCoords = [selectionCoordsStart, selectionCoordsEnd];
        selections[selectionsCount-1] = selectionCoords;

        selectedSelections[selectionsCount-1] = true;
        console.log(selectedSelections);

        startSelection = true;
        displayData(true, selectionsCount);
    }

}

/**
 * Sets the map pan and zoom
 */
function initMapZoom() {
    const zoom = d3.zoom()
        .scaleExtent([1, 20]);

    zoom.on('zoom', function (event) {
        if (drawSelectionsMode)
            return;

        const {transform} = event;
        svgMap.attr("transform", transform);
        svgMap.attr("stroke-width", 1 / transform.k);
    });

    d3.select("#map").call(zoom);
}

/**
 * Loads the flights from the csv file of the specified month
 * @param month
 */
function loadData(month) {
    flightListMonth = [];

    //Load the specified monthly data
    d3.csv('./dataset/dataset_flights_europe/flightlist_20' + month + '.csv', function (loadedRow) {
        if (loadedRow)
            flightListMonth.push(loadedRow);
    }).then(function () {
        console.log("Loaded data for " + month + ": " + flightListMonth.length + " flights found!")
        updateHighLevelInfo();
    });

    /*d3.queue()
        .defer(d3.csv, "./dataset/dataset_flights_europe/flightlist_20" + month + ".csv")
        .await((function (loadedRow) {
            if (loadedRow)
                this.flightListMonth.push(loadedRow);
        }).bind(this));*/
}

/**
 * Filters the data based on the selected filters
 * @param withinEdges if true, then show the within edges of the selected country
 * @param betweenEdges if true, then show the between edges between two selected countries
 * @param backgroundEdges if true, then show the background edges of the selected country
 * @returns {*[]} the filtered data
 */
function filterData(withinEdges, betweenEdges, backgroundEdges) {
    // Filter flight list by edges
    /*flightListMonth.filter(function (d) {
        const orig = d.origin.substring(0, 2);
        const dest = d.destination.substring(0, 2);

        if (orig === dest && selectedCountries[orig] === true) {
            if (withinEdges)
                selectedCountriesWithinEdges[orig]++;
            return withinEdges;
        } else if (selectedCountries[orig] === true && selectedCountries[dest] === true) {
            if (betweenEdges) {
                selectedCountriesOutgoingEdges[orig]++;
                selectedCountriesIncomingEdges[dest]++;
            }
            return betweenEdges;
        } else if (selectedCountries[orig] === true) {
            if (backgroundEdges)
                selectedCountriesOutgoingEdges[orig]++;
            return backgroundEdges;
        } else if (selectedCountries[dest] === true) {
            if (backgroundEdges)
                selectedCountriesIncomingEdges[dest]++;
            return backgroundEdges;
        } else
            return false;
    });*/

    // Filter flight list by selections
    return flightListMonth.filter(function (d) {
        const origCoords = [d.longitude_1, d.latitude_1];
        const destCoords = [d.longitude_2, d.latitude_2];

        for (i = 0; i < selectionsCount; i++) {
            if (selectedSelections[i] === true) {
                var selectionCoords = selections[i];
                var selectionCoordStart = selectionCoords[0];
                var selectionCoordEnd = selectionCoords[1];

                if (origCoords[0] >= selectionCoordStart[0] && origCoords[0] < selectionCoordEnd[0] &&
                    origCoords[1] <= selectionCoordStart[1] && origCoords[1] > selectionCoordEnd[1] &&
                    destCoords[0] >= selectionCoordStart[0] && destCoords[0] < selectionCoordEnd[0] &&
                    destCoords[1] <= selectionCoordStart[1] && destCoords[1] > selectionCoordEnd[1]) {
                    if (withinEdges) {
                        selectionsWithinEdges[i]++;
                        return true;
                    } else
                        return false;
                }
                if (backgroundEdges) {
                    if (origCoords[0] >= selectionCoordStart[0] && origCoords[0] < selectionCoordEnd[0] &&
                        origCoords[1] <= selectionCoordStart[1] && origCoords[1] > selectionCoordEnd[1]) {
                        for (l = 0; l < selectionsCount; l++) {
                            if (selectedSelections[l] === true) {
                                selectionCoords = selections[l];
                                selectionCoordStart = selectionCoords[0];
                                selectionCoordEnd = selectionCoords[1];

                                if (destCoords[0] >= selectionCoordStart[0] && destCoords[0] < selectionCoordEnd[0] &&
                                    destCoords[1] <= selectionCoordStart[1] && destCoords[1] > selectionCoordEnd[1]) {
                                    if (betweenEdges) {
                                        selectionsOutgoingEdges[i]++;
                                        selectionsIncomingEdges[j]++;
                                        return true;
                                    } else
                                        return false;
                                }
                            }
                        }
                        selectionsOutgoingEdges[i]++;
                        return true;
                    } else if (destCoords[0] >= selectionCoordStart[0] && destCoords[0] < selectionCoordEnd[0] &&
                        destCoords[1] <= selectionCoordStart[1] && destCoords[1] > selectionCoordEnd[1]) {
                        for (m = 0; m < selectionsCount; m++) {
                            if (selectedSelections[m] === true) {
                                selectionCoords = selections[m];
                                selectionCoordStart = selectionCoords[0];
                                selectionCoordEnd = selectionCoords[1];

                                if (origCoords[0] >= selectionCoordStart[0] && origCoords[0] < selectionCoordEnd[0] &&
                                    origCoords[1] <= selectionCoordStart[1] && origCoords[1] > selectionCoordEnd[1]) {
                                    if (betweenEdges) {
                                        selectionsOutgoingEdges[i]++;
                                        selectionsIncomingEdges[j]++;
                                        return true;
                                    } else
                                        return false;
                                }
                            }
                        }
                        selectionsIncomingEdges[i]++;
                        return true;
                    }
                }
                if (betweenEdges && !backgroundEdges) {
                    if (origCoords[0] >= selectionCoordStart[0] && origCoords[0] < selectionCoordEnd[0] &&
                        origCoords[1] <= selectionCoordStart[1] && origCoords[1] > selectionCoordEnd[1]) {
                        for (j = 0; j < selectionsCount; j++) {
                            if (selectedSelections[j] === true) {
                                selectionCoords = selections[j];
                                selectionCoordStart = selectionCoords[0];
                                selectionCoordEnd = selectionCoords[1];

                                if (j !== i && destCoords[0] >= selectionCoordStart[0] && destCoords[0] < selectionCoordEnd[0] &&
                                    destCoords[1] <= selectionCoordStart[1] && destCoords[1] > selectionCoordEnd[1]) {
                                    selectionsOutgoingEdges[i]++;
                                    selectionsIncomingEdges[j]++;
                                    return true;
                                }
                            }
                        }
                    } else if (destCoords[0] >= selectionCoordStart[0] && destCoords[0] < selectionCoordEnd[0] &&
                        destCoords[1] <= selectionCoordStart[1] && destCoords[1] > selectionCoordEnd[1]) {
                        for (k = 0; k < selectionsCount; k++) {
                            if (selectedSelections[k] === true) {
                                selectionCoords = selections[k];
                                selectionCoordStart = selectionCoords[0];
                                selectionCoordEnd = selectionCoords[1];

                                if (k !== i && origCoords[0] >= selectionCoordStart[0] && origCoords[0] < selectionCoordEnd[0] &&
                                    origCoords[1] <= selectionCoordStart[1] && origCoords[1] > selectionCoordEnd[1]) {
                                    selectionsOutgoingEdges[k]++;
                                    selectionsIncomingEdges[i]++;
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    });
}

/**
 * Draws the edges on the map according to the selected countries
 * @param highLevelInfo specifies if the high level info has to be created or removed
 * @param id
 */
function displayData(highLevelInfo, id) {
    d3.selectAll("line").remove();
    amountEdges = 0;
    resetEdgeCounters();

    var filteredData = filterData(withinEdges, betweenEdges, backgroundEdges);

    svgMap.append('g').selectAll('lines')
        .data(filteredData)
        .enter().append("line")
        .attr("x1", function (d) {
            var coordsStart = projection([d.longitude_1, d.latitude_1])
            return coordsStart[0];
        })
        .attr("y1", function (d) {
            var coordsStart = projection([d.longitude_1, d.latitude_1])
            return coordsStart[1];
        })
        .attr("x2", function (d) {
            var coordsEnd = projection([d.longitude_2, d.latitude_2])
            return coordsEnd[0];
        })
        .attr("y2", function (d) {
            var coordsEnd = projection([d.longitude_2, d.latitude_2])
            return coordsEnd[1];
        })
        .attr('stroke', "#ffe900")
        //.attr("stroke-width", Math.min(0.02 + (100 / amountLines), 0.5))    // TODO Problem bei mehreren Ländern werden alle edges dünner, auch zB von Ukraine
        .attr("stroke-width", function () {
            amountEdges++;
            return 0.1;
        })
        .attr("pointer-events", "none");

    if (id != null) {
        highLevelInfo ? createHighLevelInfo(id) : removeHighLevelInfo(id);
    }
    updateHighLevelInfo();

    d3.select("#countedges")
        .text("Total of " + amountEdges + " edges");
}

/**
 * Redraws all edges on the map and calls the high level info update function
 */
function redrawEdgesAndUpdateInfo() {
    displayData();
    //updateHighLevelInfo();
}

/**
 * Updates all high level info entries
 */
function updateHighLevelInfo() {
    d3.select("#highlevelview")
        .selectAll("p")
        .each(function () {
            let id = d3.select(this).attr("id");
            id = id.substring(id.length-1,id.length)-1;
            d3.select(this)
                .text("Selection " + id +
                    "; Within: " + selectionsWithinEdges[id] +
                    "; Outgoing: " + selectionsOutgoingEdges[id] +
                    "; Incoming: " + selectionsIncomingEdges[id]);
        })
}

/**
 * Resets all the edge counter objects
 */
function resetEdgeCounters() {
    Object.keys(selectionsWithinEdges).forEach(function (key) {
        selectionsWithinEdges[key] = 0;
    });
    Object.keys(selectionsOutgoingEdges).forEach(function (key) {
        selectionsOutgoingEdges[key] = 0;
    });
    Object.keys(selectionsIncomingEdges).forEach(function (key) {
        selectionsIncomingEdges[key] = 0;
    });
}

/**
 * Creates a high level entry in the high level view
 * @param idToCreate
 */
function createHighLevelInfo(idToCreate) {
    d3.select("#highlevelview")
        .append("p")
        .attr("id", "highlevel" + idToCreate)
        .text("Selection " + idToCreate +
            "; Within: " + selectionsWithinEdges[idToCreate-1] +
            "; Outgoing: " + selectionsOutgoingEdges[idToCreate-1] +
            "; Incoming: " + selectionsIncomingEdges[idToCreate-1]);
}

/**
 * Removes the specified high level entry
 * @param idToDelete
 */
function removeHighLevelInfo(idToDelete) {
    d3.select("#highlevel" + idToDelete).remove()
}

// For the drawing of selections //
/*function mousedown(event) {
    if (!drawSelectionsMode)
        return;

    console.log("mouse down")

    mouseCoords = d3.pointer(event);

    selectionRect = svgMap.append("rect")
        .attr("x", mouseCoords[0])
        .attr("y", mouseCoords[1])
        .attr("height", 0)
        .attr("width", 0);

    svgMap.on("mousemove", mousemove);
}

function mousemove(event) {
    if (!drawSelectionsMode)
        return;

    mouseCoords = d3.pointer(event);
    //console.log("mouse move");

    selectionRect.attr("width", Math.max(0, mouseCoords[0] - +selectionRect.attr("x")))
                .attr("height", Math.max(0, mouseCoords[1] - +selectionRect.attr("y")));
}

function mouseup() {
    console.log("mouse up")
    if (!drawSelectionsMode)
        return;

    d3.select("#selections")
        .append("p")
        .attr("id", "sel")
        .attr("name", "selection")
        .text("Selection 1")

    svgMap.on("mousemove", null);
}*/
