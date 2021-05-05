/**
 * Author: Gabriel Ratschiller
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var flightListMonth = [];
var selectedCountries = {};
var selectedCountriesWithinEdges = {};
var selectedCountriesOutgoingEdges = {};
var selectedCountriesIncomingEdges = {};

var svgMap;
var projection;

var amountEdges;

// Functions
function init() {
    loadData(1901);
    loadWorldMap();
    initMapZoom();
}

/**
 * Loads the european map from the topojson file
 */
function loadWorldMap() {
    var countries;

    //Load the world map from topojson
    d3.json('./dataset/europe_map_ICAO.json').then(function(worldData) {
        if (worldData) {
            countries = topojson.feature(worldData, worldData.objects.europe).features;
            //console.log(countries);
        }

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
                if (d3.select(this).attr("fill") !== "#ff7028") {
                    d3.select(this).attr("fill", "#20ff00")
                    d3.select(this).attr("stroke", "#20ff00")
                }
                d3.select("#countryname")
                    .text(d3.select(this).attr("name"));

            })
            .on("mouseout", function(){
                if (d3.select(this).attr("fill") !== "#ff7028") {
                    d3.select(this).attr("fill", "#000000")
                    d3.select(this).attr("stroke", "#FFFFFF")
                }
            })
            .on("click", selectedCountry);
    });
}

/**
 * Sets the color of a country if it has been clicked and adds or removes the corresponding high level information
 */
function selectedCountry() {
    if (d3.select(this).attr("fill") === "#ff7028") {
        d3.select(this).attr("fill", "#20ff00")
        selectedCountries[d3.select(this).attr("ICAO")] = false;

        displayData(false, d3.select(this));
    } else {
        d3.select(this).attr("fill", "#ff7028")
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

    //Load the specified monthly data
    d3.csv('./dataset/dataset_flights_europe/flightlist_20' + month + '.csv', function (loadedRow) {
        if (loadedRow)
            this.flightListMonth.push(loadedRow);
    }).then(function () {
        console.log(this.flightListMonth);

        displayData();
    });

    /*d3.queue()
        .defer(d3.csv, "./dataset/dataset_flights_europe/flightlist_20" + month + ".csv")
        .await((function (loadedRow) {
            console.log("es");
            if (loadedRow) this.flightListMonth.push(loadedRow);
        }).bind(this));*/
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

    svgMap.append('g').selectAll('lines')
        .data(flightListMonth.filter(function (d) {
            const orig = d.origin.substring(0, 2);
            const dest = d.destination.substring(0, 2);

            if (selectedCountries[orig] === true) {
                if (d.origin === d.destination) {
                    selectedCountriesWithinEdges[orig]++;
                }
                else {
                    selectedCountriesOutgoingEdges[orig]++;
                    selectedCountriesIncomingEdges[dest]++;
                }
                amountEdges++;
                return true;
            } else if (selectedCountries[dest] === true) {
                if (d.origin === d.destination) {
                    selectedCountriesWithinEdges[dest]++;
                }
                else {
                    selectedCountriesOutgoingEdges[orig]++;
                    selectedCountriesIncomingEdges[dest]++;
                }
                amountEdges++;
                return true;
            } else {
                return false;
            }
        }))
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
        .attr("stroke-width", 0.1)
        .attr("pointer-events", "none");

    d3.select("#countedges")
        .text("Total of " + amountEdges + " edges");

    if (country != null) {
        highLevelInfo ? createHighLevelInfo(country) : removeHighLevelInfo(country);
    }

    /*svgMap.append('g').selectAll('circles')
        .data(flightListMonth)
        .enter().append("circle")
        .attr("r", 0.2)
        .attr("cx", function (d) {
            var coords = projection([d.longitude_1, d.latitude_1])
            return coords[0];
        })
        .attr("cy", function (d) {
            var coords = projection([d.longitude_1, d.latitude_1])
            return coords[1];
        })
        .attr('fill', '#ff0000')*/
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
