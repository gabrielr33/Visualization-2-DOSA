/**
 * Authors: Gabriel Ratschiller & Martin Crepaz
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var flightListMonth = [];
var airportList = [];

var svgMap;
var svgRect;
var projection;

var amountEdges;

var withinEdges = false;
var betweenEdges = false;
var backgroundEdges = false;

var weekDays = [true,true,true,true,true,true,true];

var drawSelectionsMode = false;
var startSelection = true;
var selectionRect;
var mouseCoords;

var selections = [];
var selectionCoords = [];

var selectionCoordsStart = [];
var selectionCoordsEnd = [];

var selectedSelections = [false,false,false,false,false];
var selectionsWithinEdges = [0,0,0,0,0];
var selectionsOutgoingEdges = [0,0,0,0,0,0,0,0,0,0];
var selectionsIncomingEdges = [0,0,0,0,0,0,0,0,0,0];
var selectionsEdgeCounts = [];
var selectionsNodeCounts = [0,0,0,0,0];

var divisor;

var selectionsColors = [
    '#D33135',
    '#4986B2',
    '#5AAB56',
    '#E88628',
    '#964F9D',
    '#FFFFFF']
var selectionsColorsNames = [
    'Red',
    'Blue',
    'Green',
    'Orange',
    'Violet',
    'White'
]
var selectionColor;

var maxSelection = 5;
var selectionsCount = 0;

var refreshed;

var highLevelGraph;
var showAllEdgeCounts = false;

/**
 * At startup of the program, initializes the map, views and data
 */
function init() {
    initSelectionsEdgeCounts();
    initFilters();
    loadData(1900);
    loadWorldMap();
    initMapZoom();
    initHighLevelGraph();
}


/**
 * Initializes the filter checkboxes and inputs
 */
function initFilters() {
    d3.select('#withinEdges').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#betweenEdges').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#backgroundEdges').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#drawselections').on('change', updatedSelectionMode);
    d3.select('#edgecountsshowall').on('change', updatedEdgeCountMode);

    // Days
    d3.select('#monday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#tuesday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#wednesday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#thursday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#friday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#saturday').on('change', updatedEdgeAndWeekdayFilters);
    d3.select('#sunday').on('change', updatedEdgeAndWeekdayFilters);
}

/**
 * If an edge filter has been changed the map has to be updated
 */
function updatedEdgeAndWeekdayFilters() {
    withinEdges = d3.select('#withinEdges').property('checked');
    betweenEdges = d3.select('#betweenEdges').property('checked');
    backgroundEdges = d3.select('#backgroundEdges').property('checked');

    weekDays[1] = d3.select('#monday').property('checked');
    weekDays[2] = d3.select('#tuesday').property('checked');
    weekDays[3] = d3.select('#wednesday').property('checked');
    weekDays[4] = d3.select('#thursday').property('checked');
    weekDays[5] = d3.select('#friday').property('checked');
    weekDays[6] = d3.select('#saturday').property('checked');
    weekDays[0] = d3.select('#sunday').property('checked');
    displayData();
}

/**
 * If the selection mode has been changed
 */
function updatedSelectionMode(){
    drawSelectionsMode = d3.select('#drawselections').property('checked');
}

/**
 * If the edge count mode has been changed
 */
function updatedEdgeCountMode() {
    showAllEdgeCounts = d3.select('#edgecountsshowall').property('checked');
    // Toggle edge count displaying on and off
    highLevelGraph.edges().toggleClass('edgeLabel');
}

/**
 * Loads the european map from the topojson file
 */
function loadWorldMap() {
    let countries;

    //Load the world map from topojson
    d3.json('./dataset/europe_map_ICAO.json').then(function (worldData) {
        if (worldData)
            countries = topojson.feature(worldData, worldData.objects.europe).features;

        const margin = {top: 50, left: 50, right: 50, bottom: 50},
            height = 400 - margin.top - margin.bottom,
            width = 700 - margin.left - margin.right;

        svgMap = d3.select('#map')
            .append('svg')
            .attr('height', height + margin.top + margin.bottom)
            .attr('width', width + margin.left + margin.right)
            .append('g')
            .attr('transform', 'translate(' + (2 * margin.left) + ',' + margin.top + ')');

        projection = d3.geoMercator()
            .translate([width / 4, height*1.75])
            .scale(300)

        const geoPath = d3.geoPath()
            .projection(projection);

        svgMap.append('g').selectAll('path')
            .data(countries)
            .join('path')
            .attr('name', function (d) {
                return d.properties.NAME;
            })
            .attr('namesum', function (d) {
                return d.properties.NAMESUM;
            })
            .attr('d', geoPath)
            .attr('fill', '#000000')
            .attr('stroke', '#FFFFFF')
            .on('mouseover', function () {
                d3.select(this).attr('fill', '#053C35')
                d3.select(this).attr('stroke', '#FFFFFF')
                d3.select('#countryname')
                    .text(d3.select(this).attr('name'));
            })
            .on('mouseout', function () {
                d3.select(this).attr('fill', '#000000')
                d3.select(this).attr('stroke', '#FFFFFF')
                d3.select('#countryname')
                    .text('No country selected');
            })
            .on('mousemove', mousemove)
            .on('click', function (event) {
                if (drawSelectionsMode) {
                    drawSelection(event);
                }
            });

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
            .enter().append('circle')
            .attr('r', 0.3)
            .attr('cx', function (d) {
                const coords = projection([d.longitude, d.latitude]);
                return coords[0];
            })
            .attr('cy', function (d) {
                const coords = projection([d.longitude, d.latitude]);
                return coords[1];
            })
            .attr('fill', '#FFFFFF')
            .attr('pointer-events', 'none');

        createGradientsForSelections();
    });
}

/**
 * Gets called from the UI if the load month button has been pressed
 * @param {string} month the month whose data should be loaded into the visualization
 */
function loadDataForMonth(month) {
    d3.select('#loadingtext').text('refreshing data...');
    loadData(month);
    refreshed = true;
}

/**
 * Loads the flights from the csv file of the specified month
 * @param {string} month the month whose data should be loaded into the visualization
 */
function loadData(month) {
    flightListMonth = [];

    //Load the specified monthly data
    d3.csv('./dataset/dataset_flights_europe/flightlist_20' + month + '.csv', function (loadedRow) {
        if (loadedRow)
            flightListMonth.push(loadedRow);
    }).then(function () {
        console.log('Loaded data for ' + month + ': ' + flightListMonth.length + ' flights found!')
        //updateHighLevelInfo();
        divisor = Math.floor(flightListMonth.length/20000);
        if (refreshed) {
            displayData();
            refreshed = false;
            d3.select('#loadingtext').text('');
        }
    });
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
        svgMap.attr('transform', transform);
        svgMap.attr('stroke-width', 1 / transform.k);
    });

    d3.select('#map').call(zoom);
}

/**
 * Triggers if a selection has been made in the draw selection mode
 * @param {Object} event the mousemove event
 */
function mousemove(event) {
    if (!drawSelectionsMode || startSelection)
        return;

    mouseCoords = d3.pointer(event);
    selectionRect.attr('width', Math.max(0, mouseCoords[0] - 0.5 - +selectionRect.attr('x')))
        .attr('height', Math.max(0, mouseCoords[1] - 0.5 - +selectionRect.attr('y')))
        .attr('stroke', function (){
            if (selectionColor !== -1)
                return selectionsColors[selectionColor];
        })
        .attr('stroke-width', 0.75)
        .attr('fill', 'none')
        .attr('pointer-events', 'none');
}

/**
 * Find the first free selection slot
 * @returns {number} the index of the first free selection slot in the selected selections array
 */
function findFirstFreeSelectionsSlot(){
    for (let i = 0; i < selectedSelections.length; i++) {
        if (selectedSelections[i] === false) {
            selectedSelections[i] = true;
            return i;
        }
    }
    return -1;
}

/**
 * Responsible for the selections drawing process
 * @param {Object} event the mouse click event
 */
function drawSelection(event) {
    if (selectionsCount >= maxSelection)
        return;

    mouseCoords = d3.pointer(event);
    if (startSelection) {
        selectionRect = svgMap.append('rect')
            .attr('x', mouseCoords[0])
            .attr('y', mouseCoords[1])
            .attr('height', 0)
            .attr('width', 0);

        selectionColor = findFirstFreeSelectionsSlot();
        selectionCoordsStart = projection.invert([mouseCoords[0], mouseCoords[1]]);
        startSelection = false;
    } else {
        selectionsCount++;
        selectionRect
            .attr('id', function () {
                if (selectionColor !== -1)
                    return 'selection' + selectionColor + 'R';})
            .attr('width', Math.max(0, mouseCoords[0] - +selectionRect.attr('x')))
            .attr('height', Math.max(0, mouseCoords[1] - +selectionRect.attr('y')));

        d3.select('#selectionsList')
            .append('li')
            .attr('id', function (){
                if (selectionColor !== -1)
                    return 'selectionslistelement' + selectionColor;
            })
            .append('p')
            .attr('id', function (){
                if (selectionColor !== -1)
                    return 'selection' + selectionColor + 'P';
            })
            .text('Selection ' + selectionsColorsNames[selectionColor])
            .on('mouseover', function () {
                let sel = d3.select(this).attr('id');
                sel = '#' + sel.substring(0, sel.length-1) + 'R';
                // Detail view map rect
                d3.select(sel).attr('stroke', '#FFFFFF');
                // High level graph node
                const selectionNr = parseInt(sel.substring(sel.length-2,sel.length-1));
                highLevelGraph.$('#Selection' + selectionNr).css('border-color', '#FFFFFF');
                highLevelGraph.$('#Selection' + selectionNr).css('color', '#FFFFFF');
            })
            .on('mouseout', function () {
                let sel = d3.select(this).attr('id');
                let nr = sel.substring(9, sel.length-1);
                sel = '#' + sel.substring(0, sel.length-1) + 'R';
                // Detail view map rect
                d3.select(sel).attr('stroke', selectionsColors[nr]);
                // High level graph node
                highLevelGraph.$('#Selection' + nr).css('border-color', selectionsColors[nr]);
                highLevelGraph.$('#Selection' + nr).css('color', selectionsColors[nr]);
            })
            .append('button')
            .attr('type', 'button')
            .attr('class', 'btn-sm btn-labeled btn-danger')
            .attr('id', 'selection' + selectionColor)
            .attr('value', 'Delete Selection ' + selectionsColorsNames[selectionColor])
            .on('click', function () {
                const id = d3.select(this).attr('id');
                const selectionNr = parseInt(id.substring(id.length-1,id.length));
                d3.select('#' + id + 'P').remove();
                d3.select('#' + id + 'R').remove();
                d3.select('#selectionslistelement' + selectionNr).remove();
                selectedSelections[selectionNr] = false;
                console.log(selectedSelections);
                selectionsCount--;
                displayData(false, selectionNr+1);
            })
            .append('span')
            .attr('class','btn-label')
            .append('i')
            .attr('class','fa fa-trash');

        selectionCoordsEnd = projection.invert([mouseCoords[0], mouseCoords[1]]);
        selectionCoords = [selectionCoordsStart, selectionCoordsEnd];
        selections[selectionColor] = selectionCoords;

        countAirportsForSelection(selectionColor);

        selectedSelections[selectionColor] = true;
        //console.log(selectedSelections);

        startSelection = true;
        displayData(true, selectionColor+1);
    }
}

/**
 * Counts the airports within a selection for display in the high level graph
 * @param {number} id the selection id
 */
function countAirportsForSelection(id) {
    let start = selectionCoords[0];
    let end = selectionCoords[1];

    for (let i = 0; i < airportList.length; i++) {
        let airportLong = airportList[i].longitude;
        let airportLat = airportList[i].latitude;

        if (airportLong > start[0] && airportLat < start[1] && airportLong < end[0] && airportLat > end[1]) {
            selectionsNodeCounts[id]++;
        }
    }
}

/**
 * Deletes all selections in the map and high level graph
 */
function deleteAllSelections() {
    for (let i = 0; i < maxSelection; i++) {
        d3.select('#selection' + i + 'P').remove();
        d3.select('#selection' + i + 'R').remove();
        selectedSelections[i] = false;
        selectionsNodeCounts[i] = 0;
        selectionsCount--;
        displayData(false, i + 1);
    }
}

/**
 * Filters the data based on the selected filters
 * @param {boolean} withinEdges if true, then show the within edges of the selected country
 * @param {boolean} betweenEdges if true, then show the between edges between two selected countries
 * @param {boolean} backgroundEdges if true, then show the background edges of the selected country
 * @returns {Array} the filtered data
 */
function filterData(withinEdges, betweenEdges, backgroundEdges) {
    // Filter flight list by selections and edges
    return flightListMonth.filter(function (d) {
        const origCoords = [d.longitude_1, d.latitude_1];
        const destCoords = [d.longitude_2, d.latitude_2];
        const dayNameFormat = d3.timeFormat('%w');
        const weekday = dayNameFormat(new Date(d.day));

        for (let i = 0; i < maxSelection; i++) {
            if (selectedSelections[i] === true) {
                let selectionCoords = selections[i];

                if (checkCoords(selectionCoords, origCoords, destCoords)) {
                    if (withinEdges) {
                        if (!weekDays[weekday])
                            return false;
                        selectionsEdgeCounts[i][i]++;
                        amountEdges++;
                        if (d.id % divisor !== 0)
                            return false;
                        d.edgeStartColor = selectionsColorsNames[i];
                        d.edgeEndColor = selectionsColorsNames[i];
                        return true;
                    } else
                        return false;
                }
                if (backgroundEdges) {
                    if (checkCoords(selectionCoords, origCoords)) {
                        for (let l = 0; l < maxSelection; l++) {
                            if (selectedSelections[l] === true) {
                                selectionCoords2 = selections[l];
                                if (checkCoords(selectionCoords2, destCoords)) {
                                    if (betweenEdges) {
                                        if (!weekDays[weekday])
                                            return false;
                                        selectionsEdgeCounts[i][l]++;
                                        amountEdges++;
                                        if (d.id % divisor !== 0)
                                            return false;
                                        d.edgeStartColor = selectionsColorsNames[i];
                                        d.edgeEndColor = selectionsColorsNames[l];
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                            }
                        }
                        if (!weekDays[weekday])
                            return false;
                        selectionsEdgeCounts[i][i + maxSelection]++;
                        amountEdges++;
                        if (d.id % divisor !== 0)
                            return false;
                        d.edgeStartColor = selectionsColorsNames[i];
                        d.edgeEndColor = 'White';
                        return true;
                    } else if (checkCoords(selectionCoords, destCoords)) {
                        for (let m = 0; m < maxSelection; m++) {
                            if (selectedSelections[m] === true) {
                                selectionCoords2 = selections[m];
                                if (checkCoords(selectionCoords2, origCoords)) {
                                    if (betweenEdges) {
                                        if (!weekDays[weekday])
                                            return false;
                                        selectionsEdgeCounts[m][i]++;
                                        amountEdges++;
                                        if (d.id % divisor !== 0)
                                            return false;
                                        d.edgeStartColor = selectionsColorsNames[m];
                                        d.edgeEndColor = selectionsColorsNames[i];
                                        return true;
                                    } else {
                                        return false;
                                    }
                                }
                            }
                        }
                        if (!weekDays[weekday])
                            return false;
                        selectionsEdgeCounts[i + maxSelection][i]++;
                        amountEdges++;
                        if (d.id % divisor !== 0)
                            return false;
                        d.edgeStartColor = 'White';
                        d.edgeEndColor = selectionsColorsNames[i];
                        return true;
                    }
                }
                if (betweenEdges && !backgroundEdges) {
                    for (let k = 0; k < maxSelection; k++) {
                        if (selectedSelections[k] === true) {
                            selectionCoords2 = selections[k];
                            if (checkCoords(selectionCoords, origCoords) && checkCoords(selectionCoords2, destCoords) && k !== i) {
                                if (!weekDays[weekday])
                                    return false;
                                selectionsEdgeCounts[i][k]++;
                                amountEdges++;
                                if (d.id % divisor !== 0)
                                    return false;
                                d.edgeStartColor = selectionsColorsNames[i];
                                d.edgeEndColor = selectionsColorsNames[k];
                                return true;
                            } else if (checkCoords(selectionCoords, destCoords) && checkCoords(selectionCoords2, origCoords) && k !== i) {
                                if (!weekDays[weekday])
                                    return false;
                                selectionsEdgeCounts[k][i]++;
                                amountEdges++;
                                if (d.id % divisor !== 0)
                                    return false;
                                d.edgeStartColor = selectionsColorsNames[k];
                                d.edgeEndColor = selectionsColorsNames[i];
                                return true;
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
 * Checks whether the origin coordinates or the destination coordinates of a flight entry lie within a destination coordinate rect
 * @param {Array} selectionCoords the coordinates of the selection rect
 * @param {Array} origCoords the coordinates of the origin airport of the entry
 * @param {Array} destCoords the coordinates of the destinatiopn airport of the entry
 * @returns {boolean} true if the given coordinates lie within the selection coordinates, false otherwise
 */
function checkCoords(selectionCoords, origCoords, destCoords){
    let selCoordsStart;
    let selCoordsEnd;

    if (selectionCoords != null) {
        selCoordsStart = selectionCoords[0];
        selCoordsEnd = selectionCoords[1];
    } else
        return false;

    if (origCoords != null && destCoords != null && selCoordsStart != null && selCoordsEnd != null) {
        return origCoords[0] >= selCoordsStart[0] && origCoords[0] < selCoordsEnd[0] &&
            origCoords[1] <= selCoordsStart[1] && origCoords[1] > selCoordsEnd[1] &&
            destCoords[0] >= selCoordsStart[0] && destCoords[0] < selCoordsEnd[0] &&
            destCoords[1] <= selCoordsStart[1] && destCoords[1] > selCoordsEnd[1];
    }
    else if (origCoords == null && destCoords != null && selCoordsStart != null && selCoordsEnd != null){
        return destCoords[0] >= selCoordsStart[0] && destCoords[0] < selCoordsEnd[0] &&
            destCoords[1] <= selCoordsStart[1] && destCoords[1] > selCoordsEnd[1];
    }
    else if (origCoords != null && destCoords == null && selCoordsStart != null && selCoordsEnd != null) {
        return origCoords[0] >= selCoordsStart[0] && origCoords[0] < selCoordsEnd[0] &&
            origCoords[1] <= selCoordsStart[1] && origCoords[1] > selCoordsEnd[1];
    }
    else
        return false;
}

/**
 * Creates the gradients with the selection colors for the detail view edges
 */
function createGradientsForSelections(){
    // Create the gradients
    for (let i = 0; i < maxSelection+1; i++) {
        for (let j = 0; j < maxSelection+1; j++) {
            let defs = svgMap.append('defs');
            let gradient = defs.append('linearGradient')
                .attr('id', 'svgGradient' + selectionsColorsNames[i] + selectionsColorsNames[j])
                .attr('gradientUnits', 'userSpaceOnUse');

            gradient.append('stop')
                .attr('class', 'start')
                .attr('offset', '0%')
                .attr('stop-color', selectionsColors[i])
                .attr('stop-opacity', 1);

            gradient.append('stop')
                .attr('class', 'end')
                .attr('offset', '100%')
                .attr('stop-color', selectionsColors[j])
                .attr('stop-opacity', 1);

            let defs2 = svgMap.append('defs2');
            let gradient2 = defs2.append('linearGradient2')
                .attr('id', 'svgGradient' + selectionsColorsNames[j] + selectionsColorsNames[i])
                .attr('gradientUnits', 'userSpaceOnUse');

            gradient2.append('stop')
                .attr('class', 'start')
                .attr('offset', '0%')
                .attr('stop-color', selectionsColors[j])
                .attr('stop-opacity', 1);

            gradient2.append('stop')
                .attr('class', 'end')
                .attr('offset', '100%')
                .attr('stop-color', selectionsColors[i])
                .attr('stop-opacity', 1);
        }
    }
}

/**
 * Draws the edges on the map according to the selected countries
 * @param {boolean} highLevelInfo specifies if the high level info has to be created or removed
 * @param {number} id the id of the selection to be created or deleted
 */
function displayData(highLevelInfo, id) {
    d3.selectAll('line').remove();
    resetEdgeCounters();

    const filteredData = filterData(withinEdges, betweenEdges, backgroundEdges);

    svgMap.append('g').selectAll('lines')
        .data(filteredData)
        .enter().append('line')
        .attr('x1', function (d) {
            const coordsStart = projection([d.longitude_1, d.latitude_1]);
            return coordsStart[0];
        })
        .attr('y1', function (d) {
            const coordsStart = projection([d.longitude_1, d.latitude_1]);
            return coordsStart[1];
        })
        .attr('x2', function (d) {
            const coordsEnd = projection([d.longitude_2, d.latitude_2]);
            return coordsEnd[0];
        })
        .attr('y2', function (d) {
            const coordsEnd = projection([d.longitude_2, d.latitude_2]);
            return coordsEnd[1];
        })
        .attr('stroke', function (d) {
            d3.select('#svgGradient' + d.edgeStartColor + d.edgeEndColor)
                .attr('x1', projection([d.longitude_1, d.latitude_1])[0])
                .attr('y1', projection([d.longitude_1, d.latitude_1])[1])
                .attr('x2', projection([d.longitude_2, d.latitude_2])[0])
                .attr('y2', projection([d.longitude_2, d.latitude_2])[1]);

            return 'url(#svgGradient' + d.edgeStartColor + d.edgeEndColor + ')';
        })
        .attr('stroke-width', 0.1)
        .attr('pointer-events', 'none');

    if (id !== null && id !== -1)
        highLevelInfo ? createHighLevelInfo(id) : removeHighLevelInfo(id);
    updateHighLevelInfo();

    d3.select('#countedges')
        .text('Total of ' + amountEdges + ' edges');
}

/**
 * Updates all high level info entries
 */
function updateHighLevelInfo() {
    deleteAllHighLevelEdges();
    for (let i = 0; i < maxSelection * 2; i++) {
        for (let j = 0; j < maxSelection * 2; j++) {
            if (selectionsEdgeCounts[i][j] > 0 &&
                highLevelGraph.$('#Selection' + i).length !== 0 &&
                highLevelGraph.$('#Selection' + j).length !== 0 &&
                highLevelGraph.$('#edge' + i + j).length === 0) {
                addEdgeInHighLevelGraph(i, j, i, j, j, i, j);
            } else if (selectionsEdgeCounts[i][j] > 0 && highLevelGraph.$('#edge' + i + j).length === 0) {
                if (j >= maxSelection && (highLevelGraph.$('#Selection' + i).length !== 0 && highLevelGraph.$('#Selection' + i + 'B').length !== 0)) {
                    addEdgeInHighLevelGraph(i, j, i, i + 'B', 5, i, 5);
                } else if (i >= maxSelection && (highLevelGraph.$('#Selection' + j).length !== 0 && highLevelGraph.$('#Selection' + j + 'B').length !== 0)) {
                    addEdgeInHighLevelGraph(i, j, j + 'B', j, j, 5, j);
                }
            }
        }
    }
    //console.log(selectionsEdgeCounts);
}

/**
 * Adds an edge in the high level graph
 * @param {number} originId the id of the origin selection
 * @param {number} destinationId the id of the destination selection
 * @param {string} nameOrigin the name of the origin selection
 * @param {string} nameDestination the name of the destination selection
 * @param {number} arrowColorIndex the index of the color for the arrow
 * @param {number} stopColor1Index the index of the color for the origin selection
 * @param {number} stopColor2Index the index of the color for the destination selection
 */
function addEdgeInHighLevelGraph(originId, destinationId, nameOrigin, nameDestination, arrowColorIndex, stopColor1Index, stopColor2Index) {
    highLevelGraph.add({
        data: {
            id: 'edge' + originId + destinationId,
            source: 'Selection' + nameOrigin,
            target: 'Selection' + nameDestination,
            count: selectionsEdgeCounts[originId][destinationId]
        },
        style: {
            width: Math.max(3, (selectionsEdgeCounts[originId][destinationId]/amountEdges)*(30*selectionsCount)),
            'font-size': 30,
            'control-point-step-size': '80px',
            'loop-direction': '0deg',
            'loop-sweep': '-45deg',
            'source-text-offset': '100px',
            'color': '#000000',
            'target-arrow-color': selectionsColors[arrowColorIndex],
            'line-gradient-stop-colors': [selectionsColors[stopColor1Index], selectionsColors[stopColor2Index]]
        }
    });

    if (showAllEdgeCounts)
        highLevelGraph.$('#edge' + originId + destinationId).toggleClass('edgeLabel');
    else
        highLevelGraph.$('#edge' + originId + destinationId).toggleClass('edge');
}

/**
 * Deletes all high level graph edges
 */
function deleteAllHighLevelEdges() {
    for (let i = 0; i < maxSelection*2; i++) {
        for (let j = 0; j < maxSelection*2; j++) {
            if (highLevelGraph.$('#edge' + i + j).length === 0)
                continue;

            highLevelGraph.remove(
                highLevelGraph.$('#edge' + i + j)
            );
        }
    }
}

/**
 * Resets all the edge counter objects
 */
function resetEdgeCounters() {
    amountEdges = 0;
    for (let i = 0; i < maxSelection*2; i++) {
        for (let j = 0; j < maxSelection*2; j++) {
            selectionsEdgeCounts[i][j] = 0;
        }
    }
}

/**
 * Creates a node with its background node in the high level graph
 * @param {number} idToCreate the id of the selection to be created
 */
function createHighLevelInfo(idToCreate) {
    let id = idToCreate - 1;

    // Add a node to the high level graph
    highLevelGraph.add({
        data: {
            id: 'Selection' + id,
            count: selectionsNodeCounts[id]
        },
        style: {
            width: 100,
            height: 100,
            'color': selectionsColors[id],
            'border-color': selectionsColors[id]
        }
    });

    highLevelGraph.add({
        data: {id: 'Selection' + id + 'B'},
        style: {
            width: 7,
            height: 7,
            'color': '#FFFFFF',
            'border-color': '#ffffff',
            'background-color': '#dbdbdb',
            'label': '.'
        }
    });

    highLevelGraph.layout({
        name: 'circle'
    }).run();
}

/**
 * Removes the specified high level entry
 * @param {number} idToDelete the id of the selection to be deleted
 */
function removeHighLevelInfo(idToDelete) {
    highLevelGraph.remove(
        highLevelGraph.$('#Selection' + (idToDelete-1))
    );
    highLevelGraph.remove(
        highLevelGraph.$('#Selection' + (idToDelete-1) + 'B')
    );
    selectionsNodeCounts[idToDelete-1] = 0;
    highLevelGraph.layout({
        name: 'circle'
    }).run();
}

/**
 * Initializes the edge count array with default values
 */
function initSelectionsEdgeCounts() {
    // Fill the edge count array
    for (let i = 0; i < maxSelection*2; i++) {
        selectionsEdgeCounts.push([0,0,0,0,0,0,0,0,0,0]);
    }
}

/**
 * Initializes the high level view graph
 */
function initHighLevelGraph() {
    highLevelGraph = cytoscape({
        container: document.getElementById('cy'),
        style: [
            {
                selector: 'node',
                style: {
                    shape: 'rectangle',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': 20,
                    'border-width': 3,
                    'background-color': '#efe5eb',
                    'label': 'data(id)'
                }
            },
            {
                selector: '.nodeLabel',
                css: {
                    'label': (ele) => {
                        if (ele.isNode()) return ele.data('count');
                    }
                }
            },
            {
                selector: 'edge',
                style: {
                    'overlay-color': '#000000',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'line-fill': 'linear-gradient',
                    'line-gradient-stop-positions': ['0%', '80%'],
                }
            },
            {
                selector: '.edgeLabel',
                css: {
                    'label': (ele) => {
                        if (ele.isEdge()) return ele.data('count');
                    }
                }
            }
        ],
        wheelSensitivity: 0.4
    });

    // Hovering edges displays edge count
    highLevelGraph.on('mouseover', 'edge', function (e) {
        if (!showAllEdgeCounts) {
            e.target.toggleClass('edge');
            e.target.toggleClass('edgeLabel');
        }
    });
    highLevelGraph.on('mouseout', 'edge', function (e) {
        if (!showAllEdgeCounts) {
            e.target.toggleClass('edgeLabel');
            e.target.toggleClass('edge');
        }
    });

    // Hovering node displays airports count
    highLevelGraph.on('mouseover', 'node', function (e) {
        e.target.toggleClass('node');
        e.target.toggleClass('nodeLabel');
    });
    highLevelGraph.on('mouseout', 'node', function (e) {
        e.target.toggleClass('nodeLabel');
        e.target.toggleClass('node');
    });
}
