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

var svgMap;
var projection;

var amountLines;

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
            .attr("ICAO", function(d) {
                selectedCountries[d.properties.ICAO] = false;
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

function selectedCountry() {
    if (d3.select(this).attr("fill") === "#ff7028") {
        d3.select(this).attr("fill", "#20ff00")
        selectedCountries[d3.select(this).attr("ICAO")] = false;
    } else {
        d3.select(this).attr("fill", "#ff7028")
        d3.select(this).attr("stroke", "#FFFFFF")
        selectedCountries[d3.select(this).attr("ICAO")] = true;
    }
    displayData();
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

function displayData() {
    d3.selectAll("line").remove();
    amountLines = 0;

    svgMap.append('g').selectAll('lines')
        .data(flightListMonth.filter(function (d) {
            if (selectedCountries[d.origin.substring(0, 2)] === true) {
                amountLines++;
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
        .attr("stroke-width", Math.min(0.02 + (100 / amountLines), 0.5))
        .attr("pointer-events", "none");

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
