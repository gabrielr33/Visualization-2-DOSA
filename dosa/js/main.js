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
var selectedCountriesWithinEdges = {};
var selectedCountriesOutgoingEdges = {};
var selectedCountriesIncomingEdges = {};

var svgMap;
var projection;

var amountEdges;

var withinEdges = false;
var betweenEdges = false;
var backgroundEdges = false;

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
function initFilters(){
    d3.select("#withinEdges").on("change",updatedFilters);
    d3.select("#betweenEdges").on("change",updatedFilters);
    d3.select("#backgroundEdges").on("change",updatedFilters);
}

/**
 * If a filter has been changed the map has to bee updated
 */
function updatedFilters(){
    withinEdges = d3.select("#withinEdges").property("checked");
    betweenEdges = d3.select("#betweenEdges").property("checked");
    backgroundEdges = d3.select("#backgroundEdges").property("checked");
    displayData(true);
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
    d3.json('./dataset/europe_map_ICAO.json').then(function(worldData) {
        if (worldData)
            countries = topojson.feature(worldData, worldData.objects.europe).features;

        var margin = {top: 50, left: 50, right:50, bottom:50},
            height = 600 - margin.top - margin.bottom,
            width = 900 - margin.left - margin.right;

        svgMap = d3.select("#map")
            .append('svg')
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + (2 * margin.left) + "," + margin.top + ")");

        projection = d3.geoMercator()
            .translate([width/3,height*1.7])
            .scale(500)

        var geoPath = d3.geoPath()
            .projection(projection)

        svgMap.append('g').selectAll('path')
            .data(countries)
            .join('path')
            .attr("name", function(d) {
                return d.properties.NAME;
            })
            .attr("namesum", function(d) {
                return d.properties.NAMESUM;
            })
            .attr("ICAO", function(d) {
                selectedCountries[d.properties.ICAO] = false;
                selectedCountriesWithinEdges[d.properties.ICAO] = 0;
                selectedCountriesOutgoingEdges[d.properties.ICAO] = 0;
                selectedCountriesIncomingEdges[d.properties.ICAO] = 0;
                return d.properties.ICAO;
            })
            .attr('d', geoPath)
            .attr('fill', '#000000')
            .attr('stroke', '#FFFFFF')
            .on("mouseover", function(){
                if (d3.select(this).attr("fill") !== "#83d0c9") {
                    d3.select(this).attr("fill", "#35a79c")
                    d3.select(this).attr("stroke", "#35a79c")
                }
                d3.select("#countryname")
                    .text(d3.select(this).attr("name"));

            })
            .on("mouseout", function(){
                if (d3.select(this).attr("fill") !== "#83d0c9") {
                    d3.select(this).attr("fill", "#000000")
                    d3.select(this).attr("stroke", "#FFFFFF")
                }
            })
            .on("click", selectedCountry);

        loadAirports();
    });
}

/**
 * Loads the european airports and draws them as circles
 */
function loadAirports(){
    d3.csv('./dataset/airports.csv', function (airportData) {
        if (airportData)
            this.airportList.push(airportData);
    }).then(function () {
        //console.log(this.airportList);

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
            .attr('fill', '#ff5703');
    });
}

/**
 * Sets the color of a country if it has been clicked and adds or removes the corresponding high level information
 */
function selectedCountry() {
    if (d3.select(this).attr("fill") === "#83d0c9") {
        d3.select(this).attr("fill", "#35a79c")
        selectedCountries[d3.select(this).attr("ICAO")] = false;

        displayData(false, d3.select(this));
    } else {
        d3.select(this).attr("fill", "#83d0c9")
        d3.select(this).attr("stroke", "#FFFFFF")
        selectedCountries[d3.select(this).attr("ICAO")] = true;

        displayData(true, d3.select(this));
    }
}

/**
 * Sets the map pan and zoom
 */
function initMapZoom() {
    const zoom = d3.zoom()
        .scaleExtent([1, 10]);

    zoom.on('zoom', function (event) {
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
    this.flightListMonth = [];

    //Load the specified monthly data
    d3.csv('./dataset/dataset_flights_europe/flightlist_20' + month + '.csv', function (loadedRow) {
        if (loadedRow)
            flightListMonth.push(loadedRow);
    }).then(function () {
        //console.log(flightListMonth);
        console.log("Loaded data for " + month + ": " + flightListMonth.length + " flights found!")
        displayData();
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
    return flightListMonth.filter(function (d) {
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
    });
}

/**
 * Draws the edges on the map according to the selected countries
 * @param highLevelInfo specifies if the high level info has to be created or removed
 * @param country
 */
function displayData(highLevelInfo, country) {
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

    d3.select("#countedges")
        .text("Total of " + amountEdges + " edges");

    if (country != null) {
        highLevelInfo ? createHighLevelInfo(country) : removeHighLevelInfo(country);
    }

    if (highLevelInfo && country == null) {
        d3.select("#highlevelview")
            .selectAll("p")
            .each(function () {
                d3.select(this)
                    .text(d3.select(this).attr("name") +
                        "; Within: " + selectedCountriesWithinEdges[d3.select(this).attr("ICAO")] +
                        "; Outgoing: " + selectedCountriesOutgoingEdges[d3.select(this).attr("ICAO")] +
                        "; Incoming: " + selectedCountriesIncomingEdges[d3.select(this).attr("ICAO")])
            })
    }
}

/**
 * Resets all the edge counter objects
 */
function resetEdgeCounters(){
    Object.keys(selectedCountriesWithinEdges).forEach(function(key) { selectedCountriesWithinEdges[key] = 0; });
    Object.keys(selectedCountriesOutgoingEdges).forEach(function(key) { selectedCountriesOutgoingEdges[key] = 0; });
    Object.keys(selectedCountriesIncomingEdges).forEach(function(key) { selectedCountriesIncomingEdges[key] = 0; });
}

/**
 * Creates a high level entry in the high level view
 * @param countryToCreate
 */
function createHighLevelInfo(countryToCreate) {
    d3.select("#highlevelview")
        .append("p")
        .attr("id", "highlevel" + countryToCreate.attr("namesum"))
        .attr("name", countryToCreate.attr("name"))
        .attr("ICAO", countryToCreate.attr("ICAO"))
        .text(countryToCreate.attr("name") +
            "; Within: " + selectedCountriesWithinEdges[countryToCreate.attr("ICAO")] +
            "; Outgoing: " + selectedCountriesOutgoingEdges[countryToCreate.attr("ICAO")] +
            "; Incoming: " + selectedCountriesIncomingEdges[countryToCreate.attr("ICAO")])
}

/**
 * Removes the specified high level entry
 * @param countryToDelete
 */
function removeHighLevelInfo(countryToDelete) {
    d3.select("#highlevel" + countryToDelete.attr("namesum")).remove()
}
