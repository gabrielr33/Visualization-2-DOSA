/**
 * Authors: Gabriel Ratschiller & Martin Crepaz
 * Date: 03.04.2021
 */

// Variables
var monthMin = 1901;    // = 2019/01
var monthMax = 2103;    // = 2021/03
var selectedMonth;

var firstSeenTime;
var lastSeenTime;       // TODO add filter for day times

var flightListMonth = [];
var airportList = [];

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

var selectedSelections = [false,false,false,false,false];
var selectionsWithinEdges = [0,0,0,0,0];
var selectionsOutgoingEdges = [0,0,0,0,0];
var selectionsIncomingEdges = [0,0,0,0,0];
var selectionsEdgeCounts = [];

var selectionsColors = [
    '#D33135',
    '#4986B2',
    '#5AAB56',
    '#E88628',
    '#964F9D',
    '#FFFFFF' /*,
    '#22E0E0',
    '#FFD500',
    '#B4E931',
    '#D60E92',
    '#671D00'*/]
var selectionsColorsNames = [
    'Red',
    'Blue',
    'Green',
    'Orange',
    'Violet',
    'White'
]
var selectionColor;

var edgeStartColor = '#FFE900';
var edgeEndColor = '#FFE900';

var maxSelection = 5;
var selectionsCount = 0;

var refreshed;

var highLevelGraph;

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
    d3.select('#withinEdges').on('change', updatedEdgeFilters);
    d3.select('#betweenEdges').on('change', updatedEdgeFilters);
    d3.select('#backgroundEdges').on('change', updatedEdgeFilters);
    d3.select('#drawselections').on('change', updatedSelectionMode);
}

/**
 * If an edge filter has been changed the map has to be updated
 */
function updatedEdgeFilters() {
    withinEdges = d3.select('#withinEdges').property('checked');
    betweenEdges = d3.select('#betweenEdges').property('checked');
    backgroundEdges = d3.select('#backgroundEdges').property('checked');
    displayData();
}

/**
 * If the selection mode has been changed
 */
function updatedSelectionMode(){
    drawSelectionsMode = d3.select('#drawselections').property('checked');
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
            height = 600 - margin.top - margin.bottom,
            width = 900 - margin.left - margin.right;

        svgMap = d3.select('#map')
            .append('svg')
            .attr('height', height + margin.top + margin.bottom)
            .attr('width', width + margin.left + margin.right)
            .append('g')
            .attr('transform', 'translate(' + (2 * margin.left) + ',' + margin.top + ')');

        projection = d3.geoMercator()
            .translate([width / 3, height * 1.7])
            .scale(500)

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
 * Get called from the UI if the load month button has been pressed
 * @param month the monthly data to be loaded into the visualization
 */
function loadDataForMonth(month) {
    d3.select('#loadingtext').text('refreshing data...');
    loadData(month);      // TODO check for correct month input
    refreshed = true;
}

/**
 * Loads the flights from the csv file of the specified month
 * @param month the monthly data to be loaded into the visualization
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
 * @param event the mousemove event
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
 * @returns {number}
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
 * @param event the mouse click event
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

        d3.select('#selections')
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
            .append('input')
            .attr('type', 'button')
            .attr('class', 'button')
            .attr('id', 'selection' + selectionColor)
            .attr('value', 'Delete Selection ' + selectionsColorsNames[selectionColor])
            .on('click', function () {
                const id = d3.select(this).attr('id');
                const selectionNr = parseInt(id.substring(id.length-1,id.length));
                d3.select('#' + id + 'P').remove();
                d3.select('#' + id + 'R').remove();
                selectedSelections[selectionNr] = false;
                console.log(selectedSelections);
                selectionsCount--;
                displayData(false, selectionNr+1);
            });

        selectionCoordsEnd = projection.invert([mouseCoords[0], mouseCoords[1]]);
        selectionCoords = [selectionCoordsStart, selectionCoordsEnd];
        selections[selectionColor] = selectionCoords;

        selectedSelections[selectionColor] = true;
        console.log(selectedSelections);

        startSelection = true;
        displayData(true, selectionColor+1);
    }
}

function deleteAllSelections() {
    for (let i = 0; i < maxSelection; i++) {
        d3.select('#selection' + i + 'P').remove();
        d3.select('#selection' + i + 'R').remove();
        selectedSelections[i] = false;
        selectionsCount--;
        displayData(false, i + 1);
    }
}

/**
 * Filters the data based on the selected filters
 * @param withinEdges if true, then show the within edges of the selected country
 * @param betweenEdges if true, then show the between edges between two selected countries
 * @param backgroundEdges if true, then show the background edges of the selected country
 * @returns {*[]} the filtered data
 */
function filterData(withinEdges, betweenEdges, backgroundEdges) {
    // Filter flight list by selections and edges
    return flightListMonth.filter(function (d) {
        const origCoords = [d.longitude_1, d.latitude_1];
        const destCoords = [d.longitude_2, d.latitude_2];

        for (let i = 0; i < maxSelection; i++) {
            if (selectedSelections[i] === true) {
                let selectionCoords = selections[i];

                if (checkCoords(selectionCoords, origCoords, destCoords)) {
                    if (withinEdges) {
                        selectionsEdgeCounts[i][i]++;
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
                                        selectionsEdgeCounts[i][i]++;
                                        d.edgeStartColor = selectionsColorsNames[i];
                                        d.edgeEndColor = selectionsColorsNames[l];
                                        return true;
                                    } else
                                        return false;
                                }
                            }
                        }
                        selectionsOutgoingEdges[i]++;       // TODO background edges
                        d.edgeStartColor = selectionsColorsNames[i];
                        d.edgeEndColor = 'White';
                        return true;
                    } else if (checkCoords(selectionCoords, destCoords)) {
                        for (let m = 0; m < maxSelection; m++) {
                            if (selectedSelections[m] === true) {
                                selectionCoords2 = selections[m];
                                if (checkCoords(selectionCoords2, origCoords)) {
                                    if (betweenEdges) {
                                        selectionsEdgeCounts[m][i]++;
                                        d.edgeStartColor = selectionsColorsNames[i];
                                        d.edgeEndColor = selectionsColorsNames[m];
                                        return true;
                                    } else
                                        return false;
                                }
                            }
                        }
                        selectionsIncomingEdges[i]++;       // TODO background edges
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
                                selectionsEdgeCounts[i][k]++;
                                d.edgeStartColor = selectionsColorsNames[i];
                                d.edgeEndColor = selectionsColorsNames[k];
                                return true;
                            } else if (checkCoords(selectionCoords, destCoords) && checkCoords(selectionCoords2, origCoords) && k !== i) {
                                selectionsEdgeCounts[k][i]++;
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
 * @param selectionCoords the coordinates of the selection rect
 * @param origCoords the coordinates of the origin airport of the entry
 * @param destCoords the coordinates of the destinatiopn airport of the entry
 * @returns {boolean}
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
 *
 */
function createGradientsForSelections(){
    // Create the gradients
    for (let i = 0; i < maxSelection+1; i++) {
        for (let j = 0; j < maxSelection+1; j++) {
            let defs = svgMap.append("defs");
            let gradient = defs.append("linearGradient")
                .attr("id", "svgGradient" + selectionsColorsNames[i] + selectionsColorsNames[j])
                .attr("gradientUnits", "userSpaceOnUse");

            gradient.append("stop")
                .attr('class', 'start')
                .attr("offset", "0%")
                .attr("stop-color", selectionsColors[i])
                .attr("stop-opacity", 1);

            gradient.append("stop")
                .attr('class', 'end')
                .attr("offset", "100%")
                .attr("stop-color", selectionsColors[j])
                .attr("stop-opacity", 1);

            let defs2 = svgMap.append("defs2");
            let gradient2 = defs2.append("linearGradient2")
                .attr("id", "svgGradient" + selectionsColorsNames[j] + selectionsColorsNames[i])
                .attr("gradientUnits", "userSpaceOnUse");

            gradient2.append("stop")
                .attr('class', 'start')
                .attr("offset", "0%")
                .attr("stop-color", selectionsColors[j])
                .attr("stop-opacity", 1);

            gradient2.append("stop")
                .attr('class', 'end')
                .attr("offset", "100%")
                .attr("stop-color", selectionsColors[i])
                .attr("stop-opacity", 1);
        }
    }
}

/**
 * Draws the edges on the map according to the selected countries
 * @param highLevelInfo specifies if the high level info has to be created or removed
 * @param id the id of the selection to be created or deleted
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
                .attr("x1", projection([d.longitude_1, d.latitude_1])[0])
                .attr("y1", projection([d.longitude_1, d.latitude_1])[1])
                .attr("x2", projection([d.longitude_2, d.latitude_2])[0])
                .attr("y2", projection([d.longitude_2, d.latitude_2])[1]);

            return 'url(#svgGradient' + d.edgeStartColor + d.edgeEndColor + ')';
        })
        //.attr('stroke-width', Math.min(0.02 + (100 / amountLines), 0.5))    // TODO Problem bei mehreren Ländern werden alle edges dünner, auch zB von Ukraine
        .attr('stroke-width', function () {
            amountEdges++;
            return 0.1;
        })
        //.attr('opacity', 0.2)                 // TODO causes performance problems...?!
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
    /*d3.select('#highlevelview')
        .selectAll('p')
        .each(function () {
            let id = d3.select(this).attr('id');
            id = id.substring(id.length-1,id.length)-1;
            d3.select(this)
                .text('Selection ' + selectionsColorsNames[id] +
                    '; Within: ' + selectionsWithinEdges[id] +
                    '; Outgoing: ' + selectionsOutgoingEdges[id] +
                    '; Incoming: ' + selectionsIncomingEdges[id]);
        });*/
    deleteAllHighLevelEdges();

    for (let i = 0; i < maxSelection; i++) {
        for (let j = 0; j < maxSelection; j++) {
            if (selectionsEdgeCounts[i][j] > 0 && highLevelGraph.$('#Selection' + i).length !== 0 && highLevelGraph.$('#Selection' + j).length !== 0 && highLevelGraph.$('#edge' + i + j).length === 0) {
                    highLevelGraph.add({
                        data: {
                            id: 'edge' + i + j,
                            source: 'Selection' + i,
                            target: 'Selection' + j
                        },
                        style: {
                            width: 8,   // TODO calculate width
                            //'source-label': 'test',
                            'control-point-step-size': '80px',
                            'loop-direction': '0deg',
                            'loop-sweep': '-45deg',
                            'source-text-offset': '100px',
                            'text-rotation': 'autorotate',
                            'color': '#FFFFFF',
                            'font-size': 20,
                            'target-arrow-color': selectionsColors[j],
                            'line-gradient-stop-colors': [selectionsColors[i], selectionsColors[j]]
                        }
                    });
            }
        }
    }

    console.log(selectionsEdgeCounts);
}

/**
 * Deletes all high level graph edges
 */
function deleteAllHighLevelEdges() {
    for (let i = 0; i < maxSelection; i++) {
        for (let j = 0; j < maxSelection; j++) {
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
    for (let i = 0; i < maxSelection; i++) {
        for (let j = 0; j < maxSelection; j++) {
            selectionsEdgeCounts[i][j] = 0;
        }
    }
    /*Object.keys(selectionsWithinEdges).forEach(function (key) {
        selectionsWithinEdges[key] = 0;
    });
    Object.keys(selectionsOutgoingEdges).forEach(function (key) {
        selectionsOutgoingEdges[key] = 0;
    });
    Object.keys(selectionsIncomingEdges).forEach(function (key) {
        selectionsIncomingEdges[key] = 0;
    });*/
}

/**
 * Creates a high level entry in the high level view
 * @param idToCreate the id of the selection to be created
 */
function createHighLevelInfo(idToCreate) {
    let id = idToCreate - 1;
    /*let text = 'Selection ' + selectionsColorsNames[id] +
        '; Within: ' + selectionsWithinEdges[idToCreate] +
        '; Outgoing: ' + selectionsOutgoingEdges[idToCreate] +
        '; Incoming: ' + selectionsIncomingEdges[idToCreate];
    d3.select('#highlevelview')
        .append('p')
        .attr('id', 'highlevel' + idToCreate)
        .text(text);*/

    // Add a node to the high level graph
    highLevelGraph.add({
        data: {id: 'Selection' + id},
        style: {
            width: 100,
            height: 100,
            'color': selectionsColors[id],
            'border-color': selectionsColors[id]
        }
    });

    /*let popper1 = highLevelGraph.nodes()[0].popper({
        content: () => {
            let div = document.createElement('div');

            div.innerHTML = 'Popper content';

            document.body.appendChild(div);

            return div;
        },
        popper: {} // my popper options here
    });*/

    highLevelGraph.layout({
        name: 'circle'
    }).run();
}

/**
 * Removes the specified high level entry
 * @param idToDelete the id of the selection to be deleted
 */
function removeHighLevelInfo(idToDelete) {
    //d3.select('#highlevel' + idToDelete).remove()
    highLevelGraph.remove(
        highLevelGraph.$('#Selection' + (idToDelete-1))
    );
    highLevelGraph.layout({
        name: 'circle'
    }).run();
}

/**
 * Initializes the edge count array with default values
 */
function initSelectionsEdgeCounts() {
    // Fill the edge count array
    for (let i = 0; i < maxSelection; i++) {
        selectionsEdgeCounts.push([0, 0, 0, 0, 0]);
    }
}

/**
 * Initializes the high level view graph
 */
function initHighLevelGraph(){
    highLevelGraph = cytoscape({
        container: document.getElementById('cy'),
        style: [
            {
                selector: 'node',
                style: {
                    shape: 'rectangle',
                    "text-valign": "center",
                    "text-halign": "center",
                    'font-size': 20,
                    'border-width': 3,
                    'background-color': '#394037',
                    'label': 'data(id)'
                }
            },

            {
                selector: 'edge',
                style: {
                    'overlay-color': '#FFFFFF',
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'line-fill': 'linear-gradient',
                    'line-gradient-stop-positions': ['0%', '80%']
                }
            }
        ]
    });
    //sampleDataHighLevelGraph();
}

/*function sampleDataHighLevelGraph() {
    // Add sample edges
    highLevelGraph.add({
        data: {
            id: 'edge10',
            source: 'Selection2',
            target: 'Selection4'
        },
        style: {
            width: 8,
            'target-arrow-color': selectionsColors[4],
            'line-gradient-stop-colors': [selectionsColors[2], selectionsColors[4]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge11',
            source: 'Selection0',
            target: 'Selection4'
        },
        style: {
            width: 15,
            'target-arrow-color': selectionsColors[4],
            'line-gradient-stop-colors': [selectionsColors[0], selectionsColors[4]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge14',
            source: 'Selection4',
            target: 'Selection1'
        },
        style: {
            width: 5,
            'target-arrow-color': selectionsColors[1],
            'line-gradient-stop-colors': [selectionsColors[4], selectionsColors[1]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge16',
            source: 'Selection1',
            target: 'Selection0'
        },
        style: {
            width: 18,
            'target-arrow-color': selectionsColors[0],
            'line-gradient-stop-colors': [selectionsColors[1], selectionsColors[0]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge19',
            source: 'Selection0',
            target: 'Selection1'
        },
        style: {
            width: 8,
            'target-arrow-color': selectionsColors[1],
            'line-gradient-stop-colors': [selectionsColors[0], selectionsColors[1]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge20',
            source: 'Selection2',
            target: 'Selection3'
        },
        style: {
            width: 8,
            'target-arrow-color': selectionsColors[3],
            'line-gradient-stop-colors': [selectionsColors[2], selectionsColors[3]]
        }
    });

    highLevelGraph.add({
        data: {
            id: 'edge21',
            source: 'Selection2',
            target: 'Selection2'
        },
        style: {
            width: 8,
            'target-arrow-color': selectionsColors[2],
            'line-gradient-stop-colors': [selectionsColors[2], selectionsColors[2]]
        }
    });

    highLevelGraph.layout({
        name: 'circle'
    }).run();
}*/
