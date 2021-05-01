/**
 * Author: Gabriel Ratschiller
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var flightListMonth = [];

// Functions
function init() {
    loadData(1901);
    loadWorldMap();
}

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
            width = 1200 - margin.left - margin.right;

        var projection = d3.geoMercator()
            .translate([width/3, height*1.7])
            .scale(500)

        var geoPath = d3.geoPath()
            .projection(projection)

        let svg = d3.select("#map")
            .append('svg')
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append('g').selectAll('path')
            .data(countries)
            .join('path')
            .attr('d', geoPath)
            .attr('fill', '#FFF')
            .attr('stroke', '#000');
    });
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
