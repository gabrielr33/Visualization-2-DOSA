/**
 * Author: Gabriel Ratschiller
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var flightListMonth = [];

var svgMap;

// Functions
function init() {
    loadWorldMap();
    initMapZoom();
    loadData(1901);
}

/**
 * Loads the european map from the topojson file
 */
function loadWorldMap() {

    var countries;

    //Load the world map from topojson
    d3.json('./dataset/europe_map.json').then(function(worldData) {
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

        var projection = d3.geoMercator()
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
            .attr('d', geoPath)
            .attr('fill', '#000000')
            .attr('stroke', '#FFFFFF')
            .on("mouseover", function(){
                d3.select(this).attr("fill", "#C4EBF1")
                d3.select(this).attr("stroke", "#C4EBF1")
                d3.select("#countryname")
                    .text(d3.select(this).attr("name"));
            })
            .on("mouseout", function(){
                d3.select(this).attr("fill", "#000000")
                d3.select(this).attr("stroke", "#FFFFFF")
            })
            //.on("mousedown", mousedownSelection)
            //.on("mouseup", mouseupSelection)
    });
}

/**
 * Sets the map pan and zoom
 */
function initMapZoom() {
    const zoom = d3.zoom()
        .scaleExtent([1, 7]);

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
    d3.csv('./dataset/dataset_flights_europe/flightlist_20' + month + '.csv', function(loadedRow) {
        if (loadedRow)
            this.flightListMonth.push(loadedRow);
    }).then(function() {
        console.log(this.flightListMonth);
    });

    /*d3.queue()
        .defer(d3.csv, "./dataset/dataset_flights_europe/flightlist_20" + month + ".csv")
        .await((function (loadedRow) {
            console.log("es");
            if (loadedRow) this.flightListMonth.push(loadedRow);
        }).bind(this));*/
}

function mousedownSelection() {
    var m = d3.pointer(this);

    rect = svgMap.append("rect")
        .attr("x", m[0])
        .attr("y", m[1])
        .attr("height", 0)
        .attr("width", 0);

    svgMap.on("mousemove", mousemove);
}

function mousemove(d) {
    var m = d3.pointer(this);

    rect.attr("width", Math.max(0, m[0] - rect.attr("x")))
        .attr("height", Math.max(0, m[1] - rect.attr("y")));
}

function mouseupSelection() {
    svgMap.on("mousemove", null);
}
