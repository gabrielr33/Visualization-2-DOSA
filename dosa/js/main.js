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
}

function loadWorldMap() {

}

/**
 * Loads the flights from the csv file of the specified month
 * @param month
 */
function loadData(month) {

    //Load the specified monthly data
    /*d3.csv("./dataset/dataset_flights_europe/flightlist_20" + month + ".csv").then(function (flightListMonth) {
        flightListMonth.forEach(function (d) {
            d.latitude_1 = +d.latitude_1;
            d.longitude_1 = +d.longitude_1;
            d.latitude_2 = +d.latitude_2;
            d.longitude_2 = +d.longitude_2;
        });
        console.log("[DOSA] -> loaded " + flightListMonth.length + " flights for " + "20" + month);
    });*/

    d3.queue()
        .defer(d3.csv, "./dataset/dataset_flights_europe/flightlist_20" + month + ".csv")
        .await(function (error, flightListMonth) {
           if (error) console.log(error);

           this.flightListMonth = flightListMonth;

            this.flightListMonth.forEach(function (d) {
                d.latitude_1 = +d.latitude_1;
                d.longitude_1 = +d.longitude_1;
                d.latitude_2 = +d.latitude_2;
                d.longitude_2 = +d.longitude_2;
            });
            console.log("[DOSA] -> loaded " + this.flightListMonth.length + " flights for " + "20" + month);
        });
}
